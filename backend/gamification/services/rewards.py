from django.db import transaction
from django.db.models import F
from django.utils import timezone

from ..models import Action, PointTransaction, Reward, RewardRedemption
from .engine import _sync_profile, current_balance, lock_points


class RewardError(Exception):
    pass


class RedemptionConflict(RewardError):
    """Niedozwolone przejście statusu wymiany (np. równoległa decyzja innego admina)."""


# status docelowy -> statusy, z których wolno przejść
TRANSITIONS = {
    RewardRedemption.Status.APPROVED: {RewardRedemption.Status.PENDING},
    RewardRedemption.Status.DELIVERED: {RewardRedemption.Status.PENDING, RewardRedemption.Status.APPROVED},
    RewardRedemption.Status.REJECTED: {RewardRedemption.Status.PENDING, RewardRedemption.Status.APPROVED},
}


@transaction.atomic
def redeem(user, reward_id):
    """Atomowa wymiana nagrody za punkty.

    Blokuje saldo użytkownika (`lock_points`), potem nagrodę; waliduje saldo z ledgera
    i stan magazynowy, tworzy ujemną transakcję punktową oraz zamówienie PENDING.
    """
    lock_points(user)
    try:
        reward = Reward.objects.select_for_update().get(id=reward_id, is_active=True)
    except Reward.DoesNotExist:
        raise RewardError('Nagroda jest niedostępna.')

    if current_balance(user) < reward.cost_points:
        raise RewardError('Za mało punktów na tę nagrodę.')

    if reward.stock is not None:
        if reward.stock <= 0:
            raise RewardError('Nagroda wyczerpana.')
        reward.stock -= 1
        reward.save(update_fields=['stock'])

    PointTransaction.objects.create(
        user=user,
        action=Action.REWARD_REDEEMED,
        points=-reward.cost_points,
        metadata={'reward_id': reward.id, 'reward_name': reward.name},
    )
    redemption = RewardRedemption.objects.create(
        user=user,
        reward=reward,
        points_spent=reward.cost_points,
        status=RewardRedemption.Status.PENDING,
    )

    _sync_profile(user)
    return redemption


@transaction.atomic
def set_status(redemption_id, status, handler, note=''):
    """Zmiana statusu zamówienia przez obsługującego (admin).

    Przejście jest walidowane dopiero po zablokowaniu wiersza wymiany, więc równoległe
    decyzje nie mogą np. wydać odrzuconej wymiany (-> RedemptionConflict).
    REJECTED zwraca punkty (transakcja kompensująca) i sztukę na magazyn.

    Kolejność blokad jak w `redeem` i `engine.award`: profil -> wymiana -> nagroda
    (inaczej równoległy redeem i zwrot mogą się zakleszczyć na PostgreSQL).
    """
    if status == RewardRedemption.Status.REJECTED:
        # Właściciel wymiany się nie zmienia, więc można go odczytać przed blokadą.
        owner = RewardRedemption.objects.select_related('user').get(id=redemption_id).user
        lock_points(owner)
    # of=('self',): blokujemy tylko wymianę, złączone nagroda i user służą do odczytu.
    redemption = (
        RewardRedemption.objects.select_for_update(of=('self',))
        .select_related('reward', 'user')
        .get(id=redemption_id)
    )
    if redemption.status not in TRANSITIONS.get(status, set()):
        raise RedemptionConflict(
            f'Nie można zmienić statusu z "{redemption.get_status_display()}" '
            f'na "{RewardRedemption.Status(status).label}".'
        )

    if status == RewardRedemption.Status.REJECTED:
        PointTransaction.objects.create(
            user=redemption.user,
            action=Action.REWARD_REDEEMED,
            points=redemption.points_spent,
            metadata={'refund_for': redemption.id},
        )
        if redemption.reward.stock is not None:
            # Atomowo w bazie - bez nadpisywania równoległego redeem wartością z pamięci.
            Reward.objects.filter(pk=redemption.reward_id).update(stock=F('stock') + 1)
        _sync_profile(redemption.user)

    redemption.status = status
    redemption.handled_by = handler
    redemption.handled_at = timezone.now()
    if note:
        redemption.note = note
    redemption.save(update_fields=['status', 'handled_by', 'handled_at', 'note'])
    return redemption

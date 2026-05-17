from django.db import transaction
from django.utils import timezone

from ..models import Action, PointTransaction, Reward, RewardRedemption
from .engine import get_or_create_profile, _sync_profile


class RewardError(Exception):
    pass


@transaction.atomic
def redeem(user, reward_id):
    """Atomowa wymiana nagrody za punkty.

    Waliduje saldo i stan magazynowy, tworzy ujemną transakcję punktową
    oraz zamówienie w statusie PENDING.
    """
    try:
        reward = Reward.objects.select_for_update().get(id=reward_id, is_active=True)
    except Reward.DoesNotExist:
        raise RewardError('Nagroda jest niedostępna.')

    profile = get_or_create_profile(user)
    if profile.total_points < reward.cost_points:
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
    """Zmiana statusu zamówienia przez obsługującego (manager/admin).

    REJECTED zwraca punkty użytkownikowi (kompensująca transakcja).
    """
    redemption = RewardRedemption.objects.select_for_update().get(id=redemption_id)
    if redemption.status == status:
        return redemption

    if status == RewardRedemption.Status.REJECTED and redemption.status != RewardRedemption.Status.REJECTED:
        PointTransaction.objects.create(
            user=redemption.user,
            action=Action.REWARD_REDEEMED,
            points=redemption.points_spent,
            metadata={'refund_for': redemption.id},
        )
        if redemption.reward.stock is not None:
            redemption.reward.stock += 1
            redemption.reward.save(update_fields=['stock'])
        _sync_profile(redemption.user)

    redemption.status = status
    redemption.handled_by = handler
    redemption.handled_at = timezone.now()
    if note:
        redemption.note = note
    redemption.save(update_fields=['status', 'handled_by', 'handled_at', 'note'])
    return redemption

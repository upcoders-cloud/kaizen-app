"""Centralny silnik gamifikacji — jedyny punkt naliczania punktów."""
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from ..models import (
    Action,
    PointRule,
    PointTransaction,
    UserGamificationProfile,
)
from . import badges as badges_service
from . import levels as levels_service
from . import streaks as streaks_service


def get_or_create_profile(user):
    profile, _ = UserGamificationProfile.objects.get_or_create(user=user)
    return profile


def _rule_for(action):
    return PointRule.objects.filter(action=action, is_active=True).first()


def _within_daily_cap(user, action, cap):
    if not cap:
        return True
    today = timezone.now().date()
    count = PointTransaction.objects.filter(
        user=user,
        action=action,
        created_at__date=today,
    ).count()
    return count < cap


@transaction.atomic
def award(user, action, *, source=None, dedupe_key='', metadata=None, points_override=None):
    """Nalicza punkty za akcję.

    - Pomija jeśli brak aktywnej reguły lub przekroczony dzienny limit.
    - Idempotentne przy podanym `dedupe_key` (unikalny constraint).
    - Aktualizuje profil (punkty, poziom, passa), przelicza odznaki.

    Zwraca utworzony PointTransaction albo None.
    """
    if user is None or not getattr(user, 'is_authenticated', True):
        return None

    rule = _rule_for(action)
    points = points_override if points_override is not None else (rule.points if rule else None)
    if points is None:
        return None
    if rule and not _within_daily_cap(user, action, rule.daily_cap):
        return None

    ct = None
    obj_id = None
    if source is not None and getattr(source, 'pk', None) is not None:
        ct = ContentType.objects.get_for_model(source.__class__)
        obj_id = source.pk

    try:
        with transaction.atomic():
            txn = PointTransaction.objects.create(
                user=user,
                action=action,
                points=points,
                dedupe_key=dedupe_key or '',
                content_type=ct,
                object_id=obj_id,
                metadata=metadata or {},
            )
    except IntegrityError:
        # Duplikat (ten sam dedupe_key) — akcja już naliczona.
        return None

    _sync_profile(user, activity_date=txn.created_at.date())
    return txn


def _sync_profile(user, activity_date=None):
    """Przelicza zdenormalizowany profil z ledgera + odznaki + passę."""
    profile = get_or_create_profile(user)
    total = (
        PointTransaction.objects
        .filter(user=user)
        .aggregate(s=Sum('points'))
        ['s'] or 0
    )
    profile.total_points = total
    profile.level = levels_service.level_for_points(total)

    if activity_date is not None:
        streaks_service.apply_activity(profile, activity_date)
    profile.save()

    badges_service.evaluate_badges(user, profile)
    return profile


def recompute_profile(user):
    """Pełne przeliczenie profilu (np. po backfillu / migracji danych)."""
    profile = get_or_create_profile(user)
    txns = list(
        PointTransaction.objects.filter(user=user).order_by('created_at')
    )
    profile.total_points = sum(t.points for t in txns)
    profile.level = levels_service.level_for_points(profile.total_points)

    # Odtwórz passę z dni aktywności
    profile.current_streak = 0
    profile.longest_streak = 0
    profile.last_activity_date = None
    for t in txns:
        if t.points <= 0:
            continue
        streaks_service.apply_activity(profile, t.created_at.date())
    profile.save()

    badges_service.evaluate_badges(user, profile)
    return profile

"""Rankingi: osoby / kategorie / działy, w oknach czasowych."""
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from ..models import PointTransaction, UserGamificationProfile

PERIOD_ALL = 'all'
PERIOD_MONTH = 'month'
PERIOD_WEEK = 'week'


def _period_start(period):
    now = timezone.now()
    if period == PERIOD_WEEK:
        return now - timedelta(days=7)
    if period == PERIOD_MONTH:
        return now - timedelta(days=30)
    return None


def top_users(period=PERIOD_ALL, limit=20):
    if period == PERIOD_ALL:
        qs = (
            UserGamificationProfile.objects
            .select_related('user', 'level', 'user__department')
            .order_by('-total_points')[:limit]
        )
        return [
            {
                'user': p.user,
                'points': p.total_points,
                'level': p.level,
                'streak': p.current_streak,
            }
            for p in qs
        ]

    start = _period_start(period)
    rows = (
        PointTransaction.objects
        .filter(created_at__gte=start)
        .values('user')
        .annotate(points=Sum('points'))
        .order_by('-points')[:limit]
    )
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user_map = {u.id: u for u in User.objects.filter(
        id__in=[r['user'] for r in rows]
    ).select_related('department')}
    result = []
    for r in rows:
        u = user_map.get(r['user'])
        if not u:
            continue
        result.append({'user': u, 'points': r['points'] or 0, 'level': None, 'streak': None})
    return result


def top_categories(period=PERIOD_ALL, limit=20):
    """Suma punktów wg kategorii postów, których dotyczyły transakcje powiązane z postem."""
    from django.contrib.contenttypes.models import ContentType
    from ideas.models import KaizenPost

    post_ct = ContentType.objects.get_for_model(KaizenPost)
    qs = PointTransaction.objects.filter(content_type=post_ct)
    start = _period_start(period)
    if start is not None:
        qs = qs.filter(created_at__gte=start)

    rows = qs.values('object_id', 'points')
    cat_points = {}
    post_ids = {r['object_id'] for r in rows if r['object_id']}
    post_cat = dict(
        KaizenPost.objects.filter(id__in=post_ids)
        .values_list('id', 'category__name')
    )
    for r in rows:
        cat = post_cat.get(r['object_id'])
        if not cat:
            continue
        cat_points[cat] = cat_points.get(cat, 0) + (r['points'] or 0)

    ranked = sorted(cat_points.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    return [{'category': name, 'points': pts} for name, pts in ranked]


def top_departments(period=PERIOD_ALL, limit=20):
    """Suma punktów członków wg działu użytkownika."""
    qs = PointTransaction.objects.select_related('user__department')
    start = _period_start(period)
    if start is not None:
        qs = qs.filter(created_at__gte=start)

    rows = (
        qs.exclude(user__department__isnull=True)
        .values('user__department__id', 'user__department__name')
        .annotate(points=Sum('points'))
        .order_by('-points')[:limit]
    )
    return [
        {
            'department_id': r['user__department__id'],
            'department': r['user__department__name'],
            'points': r['points'] or 0,
        }
        for r in rows
    ]


def user_rank(user):
    """Pozycja użytkownika w rankingu all-time (1-indexed) lub None."""
    profile = getattr(user, 'gamification', None)
    if profile is None:
        return None
    higher = UserGamificationProfile.objects.filter(
        total_points__gt=profile.total_points
    ).count()
    return higher + 1

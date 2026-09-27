"""Rankingi: osoby / kategorie / działy, w oknach czasowych."""
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from ..models import PointTransaction, UserGamificationProfile

PERIOD_ALL = 'all'
PERIOD_QUARTER = 'quarter'
PERIOD_MONTH = 'month'
PERIOD_WEEK = 'week'
PERIODS = (PERIOD_WEEK, PERIOD_MONTH, PERIOD_QUARTER, PERIOD_ALL)

_PERIOD_DAYS = {PERIOD_WEEK: 7, PERIOD_MONTH: 30, PERIOD_QUARTER: 90}


def _period_start(period):
    days = _PERIOD_DAYS.get(period)
    if days is None:
        return None
    return timezone.now() - timedelta(days=days)


def _with_ranks(rows):
    """Dodaje `rank` (ranking sportowy: remis = ta sama pozycja). `rows` posortowane malejąco."""
    previous_points = None
    previous_rank = 0
    for index, row in enumerate(rows, start=1):
        if row['points'] != previous_points:
            previous_rank = index
            previous_points = row['points']
        row['rank'] = previous_rank
    return rows


def _user_points(period, department=None):
    """Lista (user_id, points) posortowana malejąco dla wszystkich aktywnych użytkowników w okresie."""
    if period == PERIOD_ALL:
        qs = UserGamificationProfile.objects.filter(user__is_active=True)
        if department:
            qs = qs.filter(user__department_id=department)
        return list(qs.order_by('-total_points', 'user_id').values_list('user_id', 'total_points'))

    qs = PointTransaction.objects.filter(
        created_at__gte=_period_start(period), user__is_active=True,
    )
    if department:
        qs = qs.filter(user__department_id=department)
    rows = qs.values('user').annotate(points=Sum('points')).order_by('-points', 'user')
    return [(r['user'], r['points'] or 0) for r in rows]


def top_users(period=PERIOD_ALL, limit=20, department=None):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    ranked = _with_ranks([
        {'user_id': uid, 'points': pts} for uid, pts in _user_points(period, department)
    ])[:limit]
    users = User.objects.filter(id__in=[r['user_id'] for r in ranked]).select_related(
        'department', 'gamification__level',
    )
    user_map = {u.id: u for u in users}
    result = []
    for r in ranked:
        user = user_map.get(r['user_id'])
        if not user:
            continue
        profile = getattr(user, 'gamification', None)
        result.append({
            'rank': r['rank'],
            'user': user,
            'points': r['points'],
            'level': profile.level if profile else None,
            'streak': profile.current_streak if profile else None,
        })
    return result


def my_position(user, period=PERIOD_ALL, department=None):
    """`{rank, points}` zalogowanego w danym rankingu (rank=None gdy brak punktów w okresie)."""
    rows = _user_points(period, department)
    points = next((pts for uid, pts in rows if uid == user.id), None)
    if points is None:
        return {'rank': None, 'points': 0}
    higher = sum(1 for _, pts in rows if pts > points)
    return {'rank': higher + 1, 'points': points}


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
    post_cat = {
        pid: (cid, name)
        for pid, cid, name in KaizenPost.objects.filter(id__in=post_ids)
        .values_list('id', 'category_id', 'category__name')
    }
    for r in rows:
        cat = post_cat.get(r['object_id'])
        if not cat:
            continue
        cat_points[cat] = cat_points.get(cat, 0) + (r['points'] or 0)

    ranked = sorted(cat_points.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    return _with_ranks([
        {'category_id': cid, 'category': name, 'points': pts} for (cid, name), pts in ranked
    ])


def top_departments(period=PERIOD_ALL, limit=20):
    """Suma punktów członków wg działu użytkownika."""
    qs = PointTransaction.objects.all()
    start = _period_start(period)
    if start is not None:
        qs = qs.filter(created_at__gte=start)

    rows = (
        qs.exclude(user__department__isnull=True)
        .values('user__department__id', 'user__department__name')
        .annotate(points=Sum('points'))
        .order_by('-points')[:limit]
    )
    return _with_ranks([
        {
            'department_id': r['user__department__id'],
            'department': r['user__department__name'],
            'points': r['points'] or 0,
        }
        for r in rows
    ])


def user_rank(user):
    """Pozycja użytkownika w rankingu all-time (1-indexed) lub None."""
    profile = UserGamificationProfile.objects.filter(user=user).first()
    if profile is None:
        return None
    higher = UserGamificationProfile.objects.filter(
        total_points__gt=profile.total_points, user__is_active=True,
    ).count()
    return higher + 1

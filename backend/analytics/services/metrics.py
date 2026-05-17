"""
Czysta warstwa agregacji analityki — funkcje bezstanowe, testowalne,
niezależne od HTTP. Widoki DRF tylko je wołają i serializują.
"""
from datetime import timedelta
from decimal import Decimal

from django.db.models import (
    Avg,
    Count,
    DecimalField,
    DurationField,
    ExpressionWrapper,
    F,
    FloatField,
    Q,
    Sum,
)
from django.db.models.functions import TruncMonth, TruncQuarter
from django.utils import timezone

from ideas.models import Category, Comment, KaizenPost, PostApproval, PostSurvey

Status = KaizenPost.Status

ACTIVE_STATUSES = [Status.SUBMITTED, Status.IN_PROGRESS, Status.IMPLEMENTED]


def _safe_div(a, b):
    a = float(a or 0)
    b = float(b or 0)
    return round(a / b, 2) if b else 0.0


def _status_breakdown(qs):
    rows = qs.values('status').annotate(n=Count('id'))
    out = {s.value: 0 for s in Status}
    for r in rows:
        out[r['status']] = r['n']
    return out


def _approval_hours(qs):
    """Średni czas (h) od utworzenia posta do decyzji APPROVED etapu MANAGER."""
    approvals = PostApproval.objects.filter(
        post__in=qs,
        stage=PostApproval.Stage.MANAGER,
        decision=PostApproval.Decision.APPROVED,
        decided_at__isnull=False,
    ).annotate(
        delta=ExpressionWrapper(
            F('decided_at') - F('post__created_at'),
            output_field=DurationField(),
        )
    )
    agg = approvals.aggregate(avg=Avg('delta'))
    delta = agg['avg']
    if not delta:
        return 0.0
    return round(delta.total_seconds() / 3600.0, 1)


def _savings(qs):
    """Zrealizowane (IMPLEMENTED) i potencjalne (wszystkie z ankietą) oszczędności."""
    realized = PostSurvey.objects.filter(
        post__in=qs, post__status=Status.IMPLEMENTED
    ).aggregate(
        money=Sum('estimated_financial_savings'),
        hours=Sum('estimated_time_savings_hours'),
    )
    potential = PostSurvey.objects.filter(post__in=qs).aggregate(
        money=Sum('estimated_financial_savings'),
        hours=Sum('estimated_time_savings_hours'),
    )
    return {
        'realized_money': float(realized['money'] or 0),
        'realized_hours': round(float(realized['hours'] or 0), 1),
        'potential_money': float(potential['money'] or 0),
        'potential_hours': round(float(potential['hours'] or 0), 1),
    }


def overview(base_qs=None):
    qs = base_qs if base_qs is not None else KaizenPost.objects.all()
    total = qs.count()
    breakdown = _status_breakdown(qs)
    non_cancelled = total - breakdown.get(Status.CANCELLED, 0)
    implemented = breakdown.get(Status.IMPLEMENTED, 0)
    avg_progress = qs.filter(status=Status.IN_PROGRESS).aggregate(
        v=Avg('progress_percent')
    )['v']
    savings = _savings(qs)
    return {
        'total_ideas': total,
        'status_breakdown': breakdown,
        'implemented_rate': _safe_div(implemented * 100, non_cancelled),
        'avg_approval_hours': _approval_hours(qs),
        'avg_progress': round(float(avg_progress or 0), 1),
        'savings': savings,
        'engagement': {
            'comments': Comment.objects.filter(post__in=qs).count(),
            'authors': qs.values('author').distinct().count(),
        },
    }


def departments():
    """KPI per dział: pomysły, % wdrożeń, oszczędności, ROI, czas akceptacji."""
    from users.models import Department

    result = []
    for dep in Department.objects.all().order_by('name'):
        qs = KaizenPost.objects.filter(author__department=dep)
        total = qs.count()
        if total == 0:
            continue
        breakdown = _status_breakdown(qs)
        implemented = breakdown.get(Status.IMPLEMENTED, 0)
        savings = _savings(qs)
        cost = qs.aggregate(c=Sum('estimated_cost'))['c'] or Decimal('0')
        result.append({
            'department_id': dep.id,
            'department': dep.name,
            'total_ideas': total,
            'implemented': implemented,
            'implemented_rate': _safe_div(implemented * 100, total),
            'savings_money': savings['realized_money'],
            'savings_potential': savings['potential_money'],
            'estimated_cost': float(cost),
            'roi': _safe_div(savings['realized_money'], float(cost)) if cost else 0.0,
            'avg_approval_hours': _approval_hours(qs),
        })
    result.sort(key=lambda r: r['savings_money'], reverse=True)
    return result


def categories():
    result = []
    for cat in Category.objects.all().order_by('name'):
        qs = KaizenPost.objects.filter(category=cat)
        total = qs.count()
        if total == 0:
            continue
        breakdown = _status_breakdown(qs)
        savings = _savings(qs)
        result.append({
            'category_id': cat.id,
            'category': cat.name,
            'total_ideas': total,
            'implemented': breakdown.get(Status.IMPLEMENTED, 0),
            'implemented_rate': _safe_div(
                breakdown.get(Status.IMPLEMENTED, 0) * 100, total
            ),
            'savings_money': savings['realized_money'],
        })
    result.sort(key=lambda r: r['total_ideas'], reverse=True)
    return result


def trends(granularity='month', months_back=12):
    """Szeregi czasowe: zgłoszenia, wdrożenia, oszczędności w okresach."""
    trunc = TruncQuarter if granularity == 'quarter' else TruncMonth
    since = timezone.now() - timedelta(days=months_back * 31)

    submissions = (
        KaizenPost.objects.filter(created_at__gte=since)
        .annotate(period=trunc('created_at'))
        .values('period')
        .annotate(n=Count('id'))
    )
    implemented = (
        KaizenPost.objects.filter(
            created_at__gte=since, status=Status.IMPLEMENTED
        )
        .annotate(period=trunc('created_at'))
        .values('period')
        .annotate(n=Count('id'))
    )
    savings = (
        PostSurvey.objects.filter(
            post__created_at__gte=since, post__status=Status.IMPLEMENTED
        )
        .annotate(period=trunc('post__created_at'))
        .values('period')
        .annotate(s=Sum('estimated_financial_savings'))
    )

    def _index(rows, key):
        return {
            r['period'].date().isoformat(): float(r[key] or 0)
            for r in rows if r['period']
        }

    sub_i = _index(submissions, 'n')
    impl_i = _index(implemented, 'n')
    sav_i = _index(savings, 's')
    periods = sorted(set(sub_i) | set(impl_i) | set(sav_i))
    return [
        {
            'period': p,
            'submissions': int(sub_i.get(p, 0)),
            'implementations': int(impl_i.get(p, 0)),
            'savings': sav_i.get(p, 0.0),
        }
        for p in periods
    ]


def activity_heatmap(user, year):
    """Mapa aktywności dzień→liczba (proxy: pozytywne transakcje punktowe)."""
    from gamification.models import PointTransaction

    start = timezone.datetime(year, 1, 1, tzinfo=timezone.get_current_timezone())
    end = timezone.datetime(year + 1, 1, 1, tzinfo=timezone.get_current_timezone())
    rows = (
        PointTransaction.objects.filter(
            user=user, created_at__gte=start, created_at__lt=end, points__gt=0
        )
        .values('created_at__date')
        .annotate(n=Count('id'))
    )
    data = {r['created_at__date'].isoformat(): r['n'] for r in rows}
    total = sum(data.values())
    return {'year': year, 'days': data, 'total': total}


def me_impact(user):
    qs = KaizenPost.objects.filter(author=user)
    total = qs.count()
    breakdown = _status_breakdown(qs)
    savings = _savings(qs)
    gamification = getattr(user, 'gamification', None)
    from gamification.services.leaderboard import user_rank

    return {
        'total_ideas': total,
        'status_breakdown': breakdown,
        'implemented': breakdown.get(Status.IMPLEMENTED, 0),
        'implemented_rate': _safe_div(
            breakdown.get(Status.IMPLEMENTED, 0) * 100, total
        ),
        'savings_generated': savings['realized_money'],
        'savings_hours': savings['realized_hours'],
        'comments_made': Comment.objects.filter(author=user).count(),
        'points': getattr(gamification, 'total_points', 0),
        'rank': user_rank(user) if gamification else None,
        'longest_streak': getattr(gamification, 'longest_streak', 0),
        'badges_count': user.badges.count() if hasattr(user, 'badges') else 0,
    }

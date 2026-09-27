"""
Analityka procesowa: SLA akceptacji, top pomysły, zespół (dział), uczestnictwo.
Funkcje bezstanowe - widoki tylko je wołają.
"""
from datetime import date, datetime, time, timedelta
from statistics import median

from django.contrib.auth import get_user_model
from django.db.models import Count, F, Max, Q, Sum
from django.utils import timezone

from ideas.models import Comment, KaizenPost, Like, PostApproval, PostSurvey

Status = KaizenPost.Status
Decision = PostApproval.Decision

SLA_DAYS = 7
PUBLIC_STATUSES = [Status.SUBMITTED, Status.IN_PROGRESS, Status.IMPLEMENTED]


def _hours(delta):
    return round(delta.total_seconds() / 3600.0, 1)


def _stage_starts(approvals):
    """Moment rozpoczęcia każdego etapu: max(utworzenie etapu, decyzja poprzedniego)."""
    starts = {}
    previous_decided = None
    for approval in sorted(approvals, key=lambda a: a.order):
        start = approval.created_at
        if previous_decided and previous_decided > start:
            start = previous_decided
        starts[approval.id] = start
        if approval.decided_at:
            previous_decided = approval.decided_at
    return starts


def approvals(posts_qs):
    """Lejek i SLA akceptacji dla postów z `posts_qs`."""
    now = timezone.now()
    stage_keys = list(PostApproval.Stage.values)

    stage_rows = (
        PostApproval.objects.filter(post__in=posts_qs)
        .select_related('post', 'approver')
        .order_by('post_id', 'order')
    )
    by_post = {}
    for approval in stage_rows:
        by_post.setdefault(approval.post_id, []).append(approval)

    decision_hours = []
    per_stage = {
        key: {'stage': key, 'pending': 0, 'approved': 0, 'rejected': 0, 'hours': []}
        for key in stage_keys
    }
    pending_items = []

    for post_approvals in by_post.values():
        starts = _stage_starts(post_approvals)
        current_found = False
        for approval in post_approvals:
            bucket = per_stage[approval.stage]
            start = starts[approval.id]
            if approval.decision in (Decision.APPROVED, Decision.REJECTED) and approval.decided_at:
                hours = max(0.0, _hours(approval.decided_at - start))
                decision_hours.append(hours)
                bucket['hours'].append(hours)
                bucket['approved' if approval.decision == Decision.APPROVED else 'rejected'] += 1
            elif (
                approval.decision == Decision.PENDING
                and not current_found
                and approval.post.status == Status.TO_VERIFY
            ):
                current_found = True
                bucket['pending'] += 1
                pending_items.append((approval, now - start))

    approved = sum(b['approved'] for b in per_stage.values())
    rejected = sum(b['rejected'] for b in per_stage.values())
    sla = timedelta(days=SLA_DAYS)
    overdue = sorted(
        [(a, waited) for a, waited in pending_items if waited > sla],
        key=lambda item: item[1],
        reverse=True,
    )

    def _avg(values):
        return round(sum(values) / len(values), 1) if values else 0.0

    return {
        'pending_by_stage': {key: per_stage[key]['pending'] for key in stage_keys},
        'pending_total': len(pending_items),
        'decided_total': approved + rejected,
        'avg_decision_hours': _avg(decision_hours),
        'median_decision_hours': round(median(decision_hours), 1) if decision_hours else 0.0,
        'overdue_count': len(overdue),
        'sla_days': SLA_DAYS,
        'approval_rate': round(approved * 100.0 / (approved + rejected), 1) if (approved + rejected) else 0.0,
        'by_stage': [
            {
                'stage': key,
                'pending': per_stage[key]['pending'],
                'approved': per_stage[key]['approved'],
                'rejected': per_stage[key]['rejected'],
                'avg_decision_hours': _avg(per_stage[key]['hours']),
            }
            for key in stage_keys
        ],
        'overdue': [
            {
                'post_id': approval.post_id,
                'title': approval.post.title,
                'stage': approval.stage,
                'approver_id': approval.approver_id,
                'approver_name': (
                    approval.approver.get_full_name() or approval.approver.username
                ) if approval.approver else None,
                'waiting_hours': _hours(waited),
            }
            for approval, waited in overdue[:10]
        ],
    }


TOP_IDEAS_ORDER = {
    'savings': F('survey__estimated_financial_savings').desc(nulls_last=True),
    'likes': F('n_likes').desc(),
    'comments': F('n_comments').desc(),
}


def top_ideas(posts_qs, by='savings', limit=10):
    """Queryset top pomysłów (z adnotacjami n_likes/n_comments) wg `by`."""
    if by not in TOP_IDEAS_ORDER:
        by = 'savings'
    qs = (
        posts_qs.select_related('author__department', 'category', 'survey')
        .prefetch_related('images')
        .annotate(
            n_likes=Count('likes', distinct=True),
            n_comments=Count('comments', distinct=True),
        )
    )
    if by == 'savings':
        qs = qs.filter(survey__isnull=False)
    return qs.order_by(TOP_IDEAS_ORDER[by], '-created_at')[:limit]


def _last_activity_map(user_ids):
    """user_id -> ostatnia aktywność (post, komentarz, lajk)."""
    result = {}
    sources = (
        KaizenPost.objects.filter(author_id__in=user_ids).values('author_id').annotate(last=Max('created_at')),
        Comment.objects.filter(author_id__in=user_ids).values('author_id').annotate(last=Max('created_at')),
        Like.objects.filter(user_id__in=user_ids).values('user_id').annotate(last=Max('created_at')),
    )
    for rows in sources:
        for row in rows:
            uid = row.get('author_id') or row.get('user_id')
            last = row['last']
            if last and (uid not in result or last > result[uid]):
                result[uid] = last
    return result


def team(department, posts_qs):
    """Podsumowanie działu i jego członków. `posts_qs` - posty po wspólnych filtrach."""
    User = get_user_model()
    members = list(
        User.objects.filter(department=department, is_active=True)
        .select_related('gamification')
        .order_by('last_name', 'first_name', 'username')
    )
    member_ids = [m.id for m in members]
    dept_posts = posts_qs.filter(author__department=department)

    per_author = {
        row['author_id']: row
        for row in dept_posts.values('author_id').annotate(
            ideas=Count('id'),
            implemented=Count('id', filter=Q(status=Status.IMPLEMENTED)),
            in_progress=Count('id', filter=Q(status__in=[Status.SUBMITTED, Status.IN_PROGRESS])),
            pending=Count('id', filter=Q(status=Status.TO_VERIFY)),
        )
    }
    last_activity = _last_activity_map(member_ids)
    active_since = timezone.now() - timedelta(days=30)

    rows = []
    for member in members:
        stats = per_author.get(member.id, {})
        profile = getattr(member, 'gamification', None)
        last = last_activity.get(member.id)
        rows.append({
            'id': member.id,
            'username': member.username,
            'nickname': member.nickname,
            'first_name': member.first_name,
            'last_name': member.last_name,
            'role': member.role,
            'ideas': stats.get('ideas', 0),
            'implemented': stats.get('implemented', 0),
            'in_progress': stats.get('in_progress', 0),
            'pending': stats.get('pending', 0),
            'points': getattr(profile, 'total_points', 0),
            'last_activity': last,
        })

    savings = PostSurvey.objects.filter(
        post__in=dept_posts, post__status=Status.IMPLEMENTED,
    ).aggregate(s=Sum('estimated_financial_savings'))['s']
    lead = getattr(department, 'lead', None)

    return {
        'department': {
            'id': department.id,
            'name': department.name,
            'lead_id': lead.id if lead else None,
            'lead_name': (lead.get_full_name() or lead.username) if lead else None,
        },
        'summary': {
            'members': len(members),
            'active_members': sum(
                1 for r in rows if r['last_activity'] and r['last_activity'] >= active_since
            ),
            'ideas': dept_posts.count(),
            'implemented': dept_posts.filter(status=Status.IMPLEMENTED).count(),
            'in_progress': dept_posts.filter(status__in=[Status.SUBMITTED, Status.IN_PROGRESS]).count(),
            'pending_approval': dept_posts.filter(status=Status.TO_VERIFY).count(),
            'points': sum(r['points'] for r in rows),
            'savings': float(savings or 0),
        },
        'members': rows,
    }


def team_ideas_in_progress(department, posts_qs, limit=20):
    return (
        posts_qs.filter(
            author__department=department,
            status__in=[Status.SUBMITTED, Status.IN_PROGRESS],
        )
        .select_related('author__department', 'category', 'survey')
        .prefetch_related('images')
        .annotate(
            n_likes=Count('likes', distinct=True),
            n_comments=Count('comments', distinct=True),
        )
        .order_by(F('deadline').asc(nulls_last=True), '-created_at')[:limit]
    )


def _next_month(day):
    return date(day.year + (day.month // 12), day.month % 12 + 1, 1)


def _month_starts(start, end):
    current = date(start.year, start.month, 1)
    while current <= end:
        yield current
        current = _next_month(current)


def _aware(day):
    return timezone.make_aware(datetime.combine(day, time.min))


def _active_user_ids(start, end, department=None):
    """Użytkownicy z aktywnością (post, komentarz, lajk) w [start, end)."""
    start_dt, end_dt = _aware(start), _aware(end)
    posts = KaizenPost.objects.filter(created_at__gte=start_dt, created_at__lt=end_dt)
    comments = Comment.objects.filter(created_at__gte=start_dt, created_at__lt=end_dt)
    likes = Like.objects.filter(created_at__gte=start_dt, created_at__lt=end_dt)
    if department:
        posts = posts.filter(author__department_id=department)
        comments = comments.filter(author__department_id=department)
        likes = likes.filter(user__department_id=department)
    ids = set(posts.values_list('author_id', flat=True))
    ids |= set(comments.values_list('author_id', flat=True))
    ids |= set(likes.values_list('user_id', flat=True))
    return ids


def participation(filters):
    """Odsetek aktywnych użytkowników per miesiąc i per dział.

    Aktywność = zgłoszony pomysł, komentarz lub lajk. Domyślny zakres: ostatnie 12 miesięcy.
    """
    from users.models import Department

    User = get_user_model()
    today = timezone.localdate()
    end = filters.date_to or today
    if filters.date_from:
        start = filters.date_from
    else:
        # 12 pełnych miesięcy wstecz, łącznie z bieżącym
        year, month = end.year, end.month - 11
        if month <= 0:
            year, month = year - 1, month + 12
        start = date(year, month, 1)
    if start > end:
        start, end = end, start
    end_exclusive = end + timedelta(days=1)

    users = User.objects.filter(is_active=True)
    if filters.department:
        users = users.filter(department_id=filters.department)

    monthly = []
    for month_start in _month_starts(start, end):
        month_end = min(_next_month(month_start), end_exclusive)
        period_start = max(month_start, start)
        eligible = set(users.filter(date_joined__lt=_aware(month_end)).values_list('id', flat=True))
        total = len(eligible)
        active = len(_active_user_ids(period_start, month_end, filters.department) & eligible)
        monthly.append({
            'period': month_start.isoformat(),
            'active_users': active,
            'total_users': total,
            'rate': round(active * 100.0 / total, 1) if total else 0.0,
        })

    active_ids = _active_user_ids(start, end_exclusive, filters.department)
    departments = []
    dept_qs = Department.objects.filter(is_active=True).order_by('name')
    if filters.department:
        dept_qs = dept_qs.filter(id=filters.department)
    for dept in dept_qs:
        member_ids = set(users.filter(department=dept).values_list('id', flat=True))
        total = len(member_ids)
        active = len(member_ids & active_ids)
        departments.append({
            'department_id': dept.id,
            'department': dept.name,
            'active_users': active,
            'total_users': total,
            'rate': round(active * 100.0 / total, 1) if total else 0.0,
        })

    all_ids = set(users.values_list('id', flat=True))
    active_total = len(all_ids & active_ids)
    return {
        'date_from': start.isoformat(),
        'date_to': end.isoformat(),
        'summary': {
            'active_users': active_total,
            'total_users': len(all_ids),
            'rate': round(active_total * 100.0 / len(all_ids), 1) if all_ids else 0.0,
        },
        'monthly': monthly,
        'departments': departments,
    }

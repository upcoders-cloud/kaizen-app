"""Budowanie querysetów postów: filtry listy, adnotacje liczników, trendy."""
from datetime import date, timedelta

from django.db.models import Count, Exists, F, OuterRef, Q
from django.utils import timezone

from access_control.permissions import is_management
from ..models import Bookmark, Comment, KaizenPost, Like, PostApproval

Status = KaizenPost.Status

PUBLIC_STATUSES = [Status.SUBMITTED, Status.IN_PROGRESS, Status.IMPLEMENTED]
HIDDEN_STATUSES = [Status.TO_VERIFY, Status.CANCELLED]

TRUTHY = ('1', 'true', 'True', 'yes')


def parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value).strip())
    except ValueError:
        return None


def with_related(qs):
    """select/prefetch dla pełnego PostSerializer (bez N+1)."""
    return qs.select_related(
        'author__department',
        'category',
        'assigned_manager__department',
        'assigned_team_lead__department',
        'assigned_director__department',
        'survey',
    ).prefetch_related('images', 'approvals__approver__department')


def with_counts(qs, user=None):
    """Adnotuje n_likes, n_comments oraz (dla zalogowanego) liked_by_me / bookmarked_by_me."""
    qs = qs.annotate(
        n_likes=Count('likes', distinct=True),
        n_comments=Count('comments', distinct=True),
    )
    if user is not None and user.is_authenticated:
        qs = qs.annotate(
            liked_by_me=Exists(Like.objects.filter(post=OuterRef('pk'), user=user)),
            bookmarked_by_me=Exists(Bookmark.objects.filter(post=OuterRef('pk'), user=user)),
        )
    return qs


def visible_to(qs, user):
    """Posty, które `user` może oglądać po ID (retrieve i akcje detail).

    Publiczne statusy widzi każdy; TO_VERIFY/CANCELLED tylko autor, osoba z łańcucha
    akceptacji posta (dowolny etap), management i admin. Reszta dostaje 404.
    """
    if is_management(user):
        return qs
    if not user.is_authenticated:
        return qs.filter(status__in=PUBLIC_STATUSES)
    in_chain = PostApproval.objects.filter(post=OuterRef('pk'), approver=user)
    return qs.annotate(in_approval_chain=Exists(in_chain)).filter(
        Q(status__in=PUBLIC_STATUSES) | Q(author=user) | Q(in_approval_chain=True)
    )


def can_view_post(post_id, user):
    """Czy `user` może oglądać post `post_id` (te same zasady co `visible_to`)."""
    return visible_to(KaizenPost.objects.filter(pk=post_id), user).exists()


def annotate_post_visible(qs, user, field='post'):
    """Adnotuje `post_visible`: czy `user` może dziś oglądać post z pola `field` (np. powiadomienia)."""
    visible = visible_to(KaizenPost.objects.filter(pk=OuterRef(field)), user)
    return qs.annotate(post_visible=Exists(visible))


def allowed_statuses(user, mine):
    """Statusy, które dany użytkownik może filtrować na liście postów."""
    if mine or is_management(user):
        return set(Status.values)
    return set(PUBLIC_STATUSES)


def filter_post_list(qs, params, user):
    """Filtry `GET /posts/` - patrz docs/team/API.md."""
    mine = params.get('mine') in TRUTHY and user.is_authenticated
    if mine:
        qs = qs.filter(author=user)

    allowed = allowed_statuses(user, mine)
    raw_status = (params.get('status') or '').strip()
    if raw_status.lower() == 'all':
        statuses = allowed
    else:
        requested = {s.strip().upper() for s in raw_status.split(',') if s.strip()}
        statuses = requested & allowed
        if not statuses:
            # Brak / niedozwolony status -> domyślnie publiczne statusy (jak dotychczas).
            statuses = set(PUBLIC_STATUSES)
    qs = qs.filter(status__in=statuses)

    search = (params.get('search') or '').strip()
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search))

    if params.get('category'):
        qs = qs.filter(category_id=params.get('category'))
    if params.get('department'):
        qs = qs.filter(author__department_id=params.get('department'))
    if params.get('author'):
        qs = qs.filter(author_id=params.get('author'))

    date_from = parse_date(params.get('date_from'))
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    date_to = parse_date(params.get('date_to'))
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    return order_posts(qs, params.get('ordering'))


def order_posts(qs, ordering):
    if ordering == 'oldest':
        return qs.order_by('created_at', 'id')
    if ordering == 'likes':
        return qs.order_by('-n_likes', '-created_at')
    if ordering == 'comments':
        return qs.order_by('-n_comments', '-created_at')
    if ordering == 'savings':
        return qs.order_by(
            F('survey__estimated_financial_savings').desc(nulls_last=True),
            '-created_at',
        )
    return qs.order_by('-created_at', '-id')


def trending(limit=5, days=14):
    """Publiczne posty z największą liczbą interakcji (lajki + komentarze) w oknie `days` dni.

    Gdy aktywnych postów jest mniej niż `limit`, lista jest uzupełniana najnowszymi.
    """
    since = timezone.now() - timedelta(days=days)
    base = KaizenPost.objects.filter(status__in=PUBLIC_STATUSES)
    recent_likes = Like.objects.filter(created_at__gte=since).values('post')
    recent_comments = Comment.objects.filter(created_at__gte=since).values('post')

    scored = (
        base.filter(Q(id__in=recent_likes) | Q(id__in=recent_comments))
        .annotate(
            recent_likes=Count('likes', filter=Q(likes__created_at__gte=since), distinct=True),
            recent_comments=Count('comments', filter=Q(comments__created_at__gte=since), distinct=True),
        )
        .annotate(score=F('recent_likes') + F('recent_comments'))
        .order_by('-score', '-created_at')
    )
    ids = list(scored.values_list('id', flat=True)[:limit])
    scores = dict(scored.filter(id__in=ids).values_list('id', 'score'))
    if len(ids) < limit:
        filler = base.exclude(id__in=ids).order_by('-created_at').values_list('id', flat=True)
        ids += list(filler[: limit - len(ids)])
    return ids, scores

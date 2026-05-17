"""Ewaluacja odznak — strategia pluggable (criteria_type → funkcja licząca metrykę)."""
from ..models import Badge, UserBadge


def _post_count_safe(user):
    from ideas.models import KaizenPost
    return KaizenPost.objects.filter(author=user).count()


def _likes_received(user, profile):
    # Suma lajków na postach autora
    from ideas.models import Like
    return Like.objects.filter(post__author=user).count()


def _implemented_count(user, profile):
    from ideas.models import KaizenPost
    return KaizenPost.objects.filter(
        author=user, status=KaizenPost.Status.IMPLEMENTED
    ).count()


def _review_count(user, profile):
    from ideas.models import PostApproval
    return PostApproval.objects.filter(
        approver=user
    ).exclude(decision=PostApproval.Decision.PENDING).exclude(
        decision=PostApproval.Decision.SKIPPED
    ).count()


def _comment_count(user, profile):
    from ideas.models import Comment
    return Comment.objects.filter(author=user).count()


def _streak(user, profile):
    return profile.longest_streak or 0


def _points(user, profile):
    return profile.total_points or 0


METRIC_RESOLVERS = {
    Badge.Criteria.POST_COUNT: lambda u, p: _post_count_safe(u),
    Badge.Criteria.LIKES_RECEIVED: _likes_received,
    Badge.Criteria.IMPLEMENTED_COUNT: _implemented_count,
    Badge.Criteria.REVIEW_COUNT: _review_count,
    Badge.Criteria.COMMENT_COUNT: _comment_count,
    Badge.Criteria.STREAK: _streak,
    Badge.Criteria.POINTS: _points,
}


def metric_value(criteria_type, user, profile):
    resolver = METRIC_RESOLVERS.get(criteria_type)
    if resolver is None:
        return 0
    try:
        return resolver(user, profile)
    except Exception:
        return 0


def evaluate_badges(user, profile):
    """Przyznaje nowe odznaki, których próg user właśnie osiągnął.

    Zwraca listę nowo przyznanych obiektów UserBadge.
    """
    owned = set(
        UserBadge.objects.filter(user=user).values_list('badge_id', flat=True)
    )
    newly = []
    for badge in Badge.objects.filter(is_active=True):
        if badge.id in owned:
            continue
        value = metric_value(badge.criteria_type, user, profile)
        if value >= badge.threshold:
            ub, created = UserBadge.objects.get_or_create(user=user, badge=badge)
            if created:
                newly.append(ub)
    return newly


def badge_progress(user, profile):
    """Lista wszystkich aktywnych odznak z postępem i statusem posiadania."""
    owned_ids = set(
        UserBadge.objects.filter(user=user).values_list('badge_id', flat=True)
    )
    out = []
    for badge in Badge.objects.filter(is_active=True):
        value = metric_value(badge.criteria_type, user, profile)
        earned = badge.id in owned_ids
        out.append({
            'badge': badge,
            'earned': earned,
            'value': value,
            'threshold': badge.threshold,
            'progress': 1.0 if earned else min(1.0, value / badge.threshold) if badge.threshold else 0.0,
        })
    return out

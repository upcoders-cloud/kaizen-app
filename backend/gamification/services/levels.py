from ..models import Level


def level_for_points(points):
    """Najwyższy poziom, którego próg <= points."""
    return (
        Level.objects.filter(min_points__lte=points)
        .order_by('-min_points')
        .first()
    )


def next_level_after(points):
    """Najbliższy poziom powyżej obecnych punktów (lub None gdy max)."""
    return (
        Level.objects.filter(min_points__gt=points)
        .order_by('min_points')
        .first()
    )


def level_progress(points):
    """Zwraca dict z postępem do następnego poziomu (0..1)."""
    current = level_for_points(points)
    nxt = next_level_after(points)
    if not nxt:
        return {'current': current, 'next': None, 'progress': 1.0, 'to_next': 0}
    base = current.min_points if current else 0
    span = nxt.min_points - base
    gained = max(0, points - base)
    progress = min(1.0, gained / span) if span > 0 else 0.0
    return {
        'current': current,
        'next': nxt,
        'progress': round(progress, 4),
        'to_next': max(0, nxt.min_points - points),
    }

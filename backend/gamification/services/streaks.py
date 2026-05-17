from datetime import timedelta


def apply_activity(profile, activity_date):
    """Aktualizuje passę na podstawie daty aktywności.

    - ta sama data → bez zmian
    - dzień po ostatniej aktywności → streak += 1
    - przerwa → streak = 1
    Zwraca True jeśli profil wymaga zapisu.
    """
    last = profile.last_activity_date
    if last == activity_date:
        return False

    if last is not None and activity_date == last + timedelta(days=1):
        profile.current_streak = (profile.current_streak or 0) + 1
    else:
        profile.current_streak = 1

    profile.last_activity_date = activity_date
    if profile.current_streak > (profile.longest_streak or 0):
        profile.longest_streak = profile.current_streak
    return True

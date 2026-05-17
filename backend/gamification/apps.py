from django.apps import AppConfig


class GamificationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gamification'
    verbose_name = 'Gamifikacja'

    def ready(self):
        # Podłącza odsprzęgnięte handlery sygnałów (gamification obserwuje ideas).
        from . import handlers  # noqa: F401

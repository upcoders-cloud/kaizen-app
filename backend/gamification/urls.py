from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    LeaderboardView,
    MeGamificationView,
    MyTransactionsView,
    RewardViewSet,
)

router = DefaultRouter()
router.register(r'rewards', RewardViewSet, basename='reward')

urlpatterns = [
    path('me/', MeGamificationView.as_view(), name='gamification-me'),
    path('leaderboard/', LeaderboardView.as_view(), name='gamification-leaderboard'),
    path('transactions/', MyTransactionsView.as_view(), name='gamification-transactions'),
    path('', include(router.urls)),
]

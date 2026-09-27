from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BadgeListView,
    LeaderboardView,
    MeGamificationView,
    MyTransactionsView,
    RewardViewSet,
    UserGamificationView,
)

router = DefaultRouter()
router.register(r'rewards', RewardViewSet, basename='reward')

urlpatterns = [
    path('me/', MeGamificationView.as_view(), name='gamification-me'),
    path('leaderboard/', LeaderboardView.as_view(), name='gamification-leaderboard'),
    path('transactions/', MyTransactionsView.as_view(), name='gamification-transactions'),
    path('badges/', BadgeListView.as_view(), name='gamification-badges'),
    path('users/<int:user_id>/', UserGamificationView.as_view(), name='gamification-user'),
    path('', include(router.urls)),
]

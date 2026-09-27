from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminBadgeViewSet,
    AdminCategoryViewSet,
    AdminDepartmentViewSet,
    AdminLevelViewSet,
    AdminPointRuleViewSet,
    AdminRedemptionViewSet,
    AdminRewardViewSet,
    AdminStatsView,
    AdminUserViewSet,
)

router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='admin-user')
router.register(r'departments', AdminDepartmentViewSet, basename='admin-department')
router.register(r'categories', AdminCategoryViewSet, basename='admin-category')
router.register(r'rewards', AdminRewardViewSet, basename='admin-reward')
router.register(r'redemptions', AdminRedemptionViewSet, basename='admin-redemption')
router.register(r'point-rules', AdminPointRuleViewSet, basename='admin-point-rule')
router.register(r'badges', AdminBadgeViewSet, basename='admin-badge')
router.register(r'levels', AdminLevelViewSet, basename='admin-level')

urlpatterns = [
    path('stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('', include(router.urls)),
]

from django.contrib import admin
from django.utils import timezone

from .models import (
    Badge,
    Level,
    PointRule,
    PointTransaction,
    Reward,
    RewardRedemption,
    UserBadge,
    UserGamificationProfile,
)
from .services.rewards import set_status


@admin.register(PointRule)
class PointRuleAdmin(admin.ModelAdmin):
    list_display = ('action', 'points', 'daily_cap', 'is_active')
    list_editable = ('points', 'daily_cap', 'is_active')


@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ('order', 'name', 'min_points', 'color')
    list_editable = ('name', 'min_points', 'color')
    ordering = ('order',)


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'criteria_type', 'threshold', 'tier', 'is_active')
    list_filter = ('criteria_type', 'tier', 'is_active')
    search_fields = ('name', 'code')


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ('user', 'badge', 'awarded_at')
    list_filter = ('badge',)
    autocomplete_fields = ('user',)


@admin.register(UserGamificationProfile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_points', 'level', 'current_streak', 'longest_streak')
    search_fields = ('user__username', 'user__nickname')
    readonly_fields = ('total_points', 'level', 'current_streak', 'longest_streak', 'last_activity_date')


@admin.register(PointTransaction)
class PointTransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'points', 'created_at')
    list_filter = ('action',)
    search_fields = ('user__username',)
    readonly_fields = ('user', 'action', 'points', 'dedupe_key', 'content_type', 'object_id', 'metadata', 'created_at')


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    list_display = ('name', 'cost_points', 'stock', 'is_active', 'order')
    list_editable = ('cost_points', 'stock', 'is_active', 'order')


@admin.register(RewardRedemption)
class RewardRedemptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'reward', 'points_spent', 'status', 'created_at', 'handled_at')
    list_filter = ('status',)
    search_fields = ('user__username', 'reward__name')
    actions = ('mark_approved', 'mark_delivered', 'mark_rejected')

    @admin.action(description='Zaakceptuj zaznaczone')
    def mark_approved(self, request, queryset):
        for r in queryset:
            set_status(r.id, RewardRedemption.Status.APPROVED, request.user)

    @admin.action(description='Oznacz jako wydane')
    def mark_delivered(self, request, queryset):
        for r in queryset:
            set_status(r.id, RewardRedemption.Status.DELIVERED, request.user)

    @admin.action(description='Odrzuć (zwrot punktów)')
    def mark_rejected(self, request, queryset):
        for r in queryset:
            set_status(r.id, RewardRedemption.Status.REJECTED, request.user)

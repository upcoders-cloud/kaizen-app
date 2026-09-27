from rest_framework import serializers

from users.serializers import UserPublicSerializer
from .models import (
    Badge,
    Level,
    PointTransaction,
    Reward,
    RewardRedemption,
)


class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ['id', 'name', 'min_points', 'order', 'color', 'icon']


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = [
            'id', 'code', 'name', 'description', 'icon',
            'criteria_type', 'threshold', 'tier', 'order',
        ]


class BadgeProgressSerializer(serializers.Serializer):
    badge = BadgeSerializer()
    earned = serializers.BooleanField()
    awarded_at = serializers.DateTimeField(allow_null=True, required=False)
    value = serializers.IntegerField()
    threshold = serializers.IntegerField()
    progress = serializers.FloatField()


class MeGamificationSerializer(serializers.Serializer):
    points = serializers.IntegerField()
    rank = serializers.IntegerField(allow_null=True)
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    level = LevelSerializer(allow_null=True)
    next_level = LevelSerializer(allow_null=True)
    level_progress = serializers.FloatField()
    points_to_next = serializers.IntegerField()
    badges = BadgeProgressSerializer(many=True)


class LeaderboardUserSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user = UserPublicSerializer()
    points = serializers.IntegerField()
    level = LevelSerializer(allow_null=True)
    streak = serializers.IntegerField(allow_null=True)


class LeaderboardCategorySerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    category_id = serializers.IntegerField()
    category = serializers.CharField()
    points = serializers.IntegerField()


class LeaderboardDepartmentSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    department_id = serializers.IntegerField()
    department = serializers.CharField()
    points = serializers.IntegerField()


class RewardSerializer(serializers.ModelSerializer):
    affordable = serializers.SerializerMethodField()

    class Meta:
        model = Reward
        fields = [
            'id', 'name', 'description', 'cost_points',
            'stock', 'icon', 'order', 'affordable',
        ]

    def get_affordable(self, obj):
        points = self.context.get('user_points', 0)
        return points >= obj.cost_points


class RewardRedemptionSerializer(serializers.ModelSerializer):
    reward = RewardSerializer(read_only=True)

    class Meta:
        model = RewardRedemption
        fields = [
            'id', 'reward', 'points_spent', 'status',
            'note', 'created_at', 'handled_at',
        ]


class PointTransactionSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = PointTransaction
        fields = ['id', 'action', 'action_display', 'points', 'metadata', 'created_at']


class BadgeStatusSerializer(serializers.Serializer):
    """Odznaka z informacją o posiadaniu i postępie dla konkretnego użytkownika."""
    id = serializers.IntegerField(source='badge.id')
    code = serializers.CharField(source='badge.code')
    name = serializers.CharField(source='badge.name')
    description = serializers.CharField(source='badge.description')
    icon = serializers.CharField(source='badge.icon')
    criteria_type = serializers.CharField(source='badge.criteria_type')
    tier = serializers.CharField(source='badge.tier')
    order = serializers.IntegerField(source='badge.order')
    threshold = serializers.IntegerField()
    value = serializers.IntegerField()
    progress = serializers.FloatField()
    earned = serializers.BooleanField()
    awarded_at = serializers.DateTimeField(allow_null=True)


class PublicGamificationSerializer(serializers.Serializer):
    user = UserPublicSerializer()
    points = serializers.IntegerField()
    rank = serializers.IntegerField(allow_null=True)
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    level = LevelSerializer(allow_null=True)
    next_level = LevelSerializer(allow_null=True)
    level_progress = serializers.FloatField()
    points_to_next = serializers.IntegerField()
    badges = BadgeStatusSerializer(many=True)

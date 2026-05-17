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
    user = UserPublicSerializer()
    points = serializers.IntegerField()
    level = LevelSerializer(allow_null=True)
    streak = serializers.IntegerField(allow_null=True)


class LeaderboardCategorySerializer(serializers.Serializer):
    category = serializers.CharField()
    points = serializers.IntegerField()


class LeaderboardDepartmentSerializer(serializers.Serializer):
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

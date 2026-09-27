from rest_framework import serializers
from django.contrib.auth import get_user_model

from access_control.permissions import permissions_payload
from .fields import Base64ImageField
from .models import Department

User = get_user_model()


def _absolute_avatar_url(instance, request):
    avatar = getattr(instance, 'avatar', None)
    if not avatar:
        return None
    url = avatar.url
    if request:
        return request.build_absolute_uri(url)
    return url


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name']


class UserPublicSerializer(serializers.ModelSerializer):
    """Publiczne dane użytkownika - używane wszędzie w API (posts, comments, notifications, users)."""

    avatar_url = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            'id',
            'nickname',
            'first_name',
            'last_name',
            'username',
            'is_staff',
            'role',
            'avatar_url',
            'department',
            'department_name',
        ]

    def get_avatar_url(self, obj):
        return _absolute_avatar_url(obj, self.context.get('request'))


class UserMeSerializer(serializers.ModelSerializer):
    avatar = Base64ImageField(required=False, allow_null=True, write_only=True)
    avatar_url = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'nickname',
            'username',
            'email',
            'first_name',
            'last_name',
            'gender',
            'is_staff',
            'is_superuser',
            'role',
            'department',
            'department_name',
            'avatar',
            'avatar_url',
            'permissions',
        ]
        read_only_fields = ['id', 'username', 'email', 'is_staff', 'is_superuser', 'role', 'department']

    def get_avatar_url(self, obj):
        return _absolute_avatar_url(obj, self.context.get('request'))

    def get_permissions(self, obj):
        return permissions_payload(obj)


class UserProfileSerializer(UserPublicSerializer):
    """Profil publiczny: dane + statystyki pomysłów + skrót gamifikacji."""

    stats = serializers.SerializerMethodField()
    gamification = serializers.SerializerMethodField()

    class Meta(UserPublicSerializer.Meta):
        fields = UserPublicSerializer.Meta.fields + ['date_joined', 'stats', 'gamification']

    def get_stats(self, obj):
        from django.db.models import Sum
        from ideas.models import KaizenPost, Like, PostSurvey

        posts = KaizenPost.objects.filter(author=obj)
        savings = PostSurvey.objects.filter(
            post__author=obj, post__status=KaizenPost.Status.IMPLEMENTED,
        ).aggregate(s=Sum('estimated_financial_savings'))['s']
        return {
            'ideas': posts.count(),
            'implemented': posts.filter(status=KaizenPost.Status.IMPLEMENTED).count(),
            'likes_received': Like.objects.filter(post__author=obj).count(),
            'savings': float(savings or 0),
        }

    def get_gamification(self, obj):
        from gamification.serializers import LevelSerializer
        from gamification.models import UserBadge

        profile = getattr(obj, 'gamification', None)
        badges = (
            UserBadge.objects.filter(user=obj, badge__is_active=True)
            .select_related('badge')
            .order_by('-awarded_at')
        )
        return {
            'total_points': getattr(profile, 'total_points', 0),
            'level': LevelSerializer(profile.level).data if profile and profile.level else None,
            'badges': [
                {
                    'id': ub.badge.id,
                    'code': ub.badge.code,
                    'name': ub.badge.name,
                    'icon': ub.badge.icon,
                    'tier': ub.badge.tier,
                    'awarded_at': ub.awarded_at,
                }
                for ub in badges
            ],
        }

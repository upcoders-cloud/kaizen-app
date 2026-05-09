from rest_framework import serializers
from django.contrib.auth import get_user_model

from .fields import Base64ImageField

User = get_user_model()


def _absolute_avatar_url(instance, request):
    avatar = getattr(instance, 'avatar', None)
    if not avatar:
        return None
    url = avatar.url
    if request:
        return request.build_absolute_uri(url)
    return url


class UserPublicSerializer(serializers.ModelSerializer):
    """Publiczne dane użytkownika — używane wszędzie w API (posts, comments, notifications, users)."""

    avatar_url = serializers.SerializerMethodField()

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
        ]

    def get_avatar_url(self, obj):
        return _absolute_avatar_url(obj, self.context.get('request'))


class UserMeSerializer(serializers.ModelSerializer):
    avatar = Base64ImageField(required=False, allow_null=True, write_only=True)
    avatar_url = serializers.SerializerMethodField()

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
            'role',
            'avatar',
            'avatar_url',
        ]
        read_only_fields = ['id', 'username', 'email', 'is_staff', 'role']

    def get_avatar_url(self, obj):
        return _absolute_avatar_url(obj, self.context.get('request'))

from rest_framework import serializers
from .models import KaizenPost, Comment, Like
from django.contrib.auth import get_user_model

User = get_user_model()


# Serializer Użytkownika - TYLKO DANE PUBLICZNE
class UserPublicSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id', 'nickname']  # Backend nie wyśle emaila ani nazwiska


class CommentSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'text', 'created_at']


class PostSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = KaizenPost
        fields = ['id', 'author', 'content', 'category', 'created_at', 'likes_count', 'comments_count',
                  'is_liked_by_me']

    def get_is_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ['id', 'user', 'post']
        read_only_fields = ['user']

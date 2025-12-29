import base64
import io
import uuid
from PIL import Image
from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import KaizenPost, Comment, Like, PostImage, PostSurvey, Notification
from django.contrib.auth import get_user_model

User = get_user_model()

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass


# Serializer Użytkownika - TYLKO DANE PUBLICZNE
class UserPublicSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id', 'nickname', 'first_name', 'last_name', 'username']


class CommentSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)
    post = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'text', 'created_at']
        read_only_fields = ['id', 'post', 'author', 'created_at']


class Base64ImageField(serializers.ImageField):
    def _get_extension(self, decoded):
        try:
            image = Image.open(io.BytesIO(decoded))
            image_format = image.format
            if not image_format:
                return 'jpg'
            image_format = image_format.lower()
            return 'jpg' if image_format == 'jpeg' else image_format
        except Exception:
            return 'jpg'

    def to_internal_value(self, data):
        if isinstance(data, str):
            if data.startswith('data:'):
                try:
                    _, data = data.split(';base64,')
                except ValueError:
                    raise serializers.ValidationError('Invalid image data.')
            try:
                decoded = base64.b64decode(data, validate=True)
            except (TypeError, ValueError):
                raise serializers.ValidationError('Invalid image data.')

            file_name = uuid.uuid4().hex[:12]
            file_extension = self._get_extension(decoded)
            data = ContentFile(decoded, name=f'{file_name}.{file_extension}')

        return super().to_internal_value(data)


class PostSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked_by_me = serializers.SerializerMethodField()
    survey = serializers.SerializerMethodField(read_only=True)
    images = serializers.ListField(
        child=Base64ImageField(),
        write_only=True,
        required=False
    )
    image_urls = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = KaizenPost
        fields = [
            'id',
            'author',
            'title',
            'content',
            'category',
            'status',
            'created_at',
            'likes_count',
            'comments_count',
            'is_liked_by_me',
            'images',
            'image_urls',
            'survey',
        ]
        read_only_fields = ['status']

    def get_is_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_image_urls(self, obj):
        request = self.context.get('request')
        urls = []
        for image in obj.images.all():
            if not image.image:
                continue
            url = image.image.url
            if request:
                url = request.build_absolute_uri(url)
            urls.append(url)
        return urls

    def get_survey(self, obj):
        survey = getattr(obj, 'survey', None)
        if not survey:
            return None
        return PostSurveySerializer(survey).data

    def create(self, validated_data):
        images = validated_data.pop('images', [])
        post = super().create(validated_data)
        for image in images:
            PostImage.objects.create(post=post, image=image)
        return post

    def update(self, instance, validated_data):
        images = validated_data.pop('images', None)
        post = super().update(instance, validated_data)
        if images:
            for image in images:
                PostImage.objects.create(post=post, image=image)
        return post

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ['id', 'user', 'post']
        read_only_fields = ['user']


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserPublicSerializer(read_only=True)
    post_id = serializers.IntegerField(source='post.id', read_only=True)
    post_title = serializers.CharField(source='post.title', read_only=True)
    comment_id = serializers.IntegerField(source='comment.id', read_only=True)
    comment_text = serializers.CharField(source='comment.text', read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'type',
            'created_at',
            'read_at',
            'is_read',
            'actor',
            'post_id',
            'post_title',
            'comment_id',
            'comment_text',
        ]

    def get_is_read(self, obj):
        return obj.read_at is not None


class PostSurveySerializer(serializers.ModelSerializer):
    class Meta:
        model = PostSurvey
        fields = [
            'frequency_value',
            'frequency_unit',
            'affected_people',
            'time_lost_minutes',
            'estimated_time_savings_hours',
            'estimated_financial_savings',
        ]
        read_only_fields = ['estimated_time_savings_hours', 'estimated_financial_savings']


class PostSurveyInputSerializer(serializers.Serializer):
    frequency_value = serializers.IntegerField(min_value=0)
    frequency_unit = serializers.ChoiceField(choices=PostSurvey.FrequencyUnit.choices)
    affected_people = serializers.IntegerField(min_value=0)
    time_lost_minutes = serializers.IntegerField(min_value=0)

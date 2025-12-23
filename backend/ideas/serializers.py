import base64
import io
import uuid
from PIL import Image
from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import KaizenPost, Comment, Like, PostImage
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
        fields = ['id', 'nickname']  # Backend nie wyśle emaila ani nazwiska


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
            'created_at',
            'likes_count',
            'comments_count',
            'is_liked_by_me',
            'images',
            'image_urls',
        ]

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

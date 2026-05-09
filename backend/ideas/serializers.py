from rest_framework import serializers
from .models import KaizenPost, Comment, Like, PostImage, PostSurvey, Notification, Category
from django.contrib.auth import get_user_model
from users.fields import Base64ImageField
from users.serializers import UserPublicSerializer

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = ['id', 'name', 'is_active']


class CommentSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)
    post = serializers.PrimaryKeyRelatedField(read_only=True)
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'parent', 'text', 'created_at']
        read_only_fields = ['id', 'post', 'author', 'created_at']

    def validate_parent(self, value):
        if value is None:
            return value
        post = self.context.get('post')
        if post is not None and value.post_id != post.id:
            raise serializers.ValidationError('Komentarz nadrzędny musi należeć do tego samego posta.')
        return value


class PostSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_items = serializers.SerializerMethodField(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked_by_me = serializers.SerializerMethodField()
    survey = serializers.SerializerMethodField(read_only=True)
    images = serializers.ListField(
        child=Base64ImageField(),
        write_only=True,
        required=False
    )
    remove_images = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    image_urls = serializers.SerializerMethodField(read_only=True)
    assigned_manager = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='MANAGER'),
        required=False,
        allow_null=True,
    )
    assigned_manager_detail = UserPublicSerializer(
        source='assigned_manager',
        read_only=True,
    )
    rejection_reason = serializers.CharField(
        read_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = KaizenPost
        fields = [
            'id',
            'author',
            'title',
            'content',
            'category',
            'category_name',
            'status',
            'created_at',
            'likes_count',
            'comments_count',
            'is_liked_by_me',
            'images',
            'remove_images',
            'image_items',
            'image_urls',
            'survey',
            'assigned_manager',
            'assigned_manager_detail',
            'rejection_reason',
        ]
        read_only_fields = ['status', 'rejection_reason']

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

    def get_image_items(self, obj):
        request = self.context.get('request')
        items = []
        for image in obj.images.all():
            if not image.image:
                continue
            url = image.image.url
            if request:
                url = request.build_absolute_uri(url)
            items.append({'id': image.id, 'url': url})
        return items

    def get_survey(self, obj):
        survey = getattr(obj, 'survey', None)
        if not survey:
            return None
        return PostSurveySerializer(survey).data

    def create(self, validated_data):
        images = validated_data.pop('images', [])
        validated_data.pop('remove_images', None)
        post = super().create(validated_data)
        for image in images:
            PostImage.objects.create(post=post, image=image)
        return post

    def update(self, instance, validated_data):
        images = validated_data.pop('images', None)
        remove_images = validated_data.pop('remove_images', [])
        post = super().update(instance, validated_data)
        if remove_images:
            PostImage.objects.filter(post=post, id__in=remove_images).delete()
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

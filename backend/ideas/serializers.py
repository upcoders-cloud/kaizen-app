from rest_framework import serializers
from .models import KaizenPost, Comment, Like, PostImage, PostSurvey, Notification, Category, Bookmark, PostApproval
from django.contrib.auth import get_user_model
from users.fields import Base64ImageField
from users.serializers import UserPublicSerializer
from .services.queries import can_view_post

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = ['id', 'name', 'is_active']


class PostApprovalSerializer(serializers.ModelSerializer):
    approver = UserPublicSerializer(read_only=True)

    class Meta:
        model = PostApproval
        fields = ['id', 'stage', 'order', 'approver', 'decision', 'comment', 'decided_at', 'created_at']
        read_only_fields = fields


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


class PostImageInputField(serializers.Field):
    """Zdjęcie do zapisu: string base64 (typ GENERAL, format mobile) albo
    obiekt `{"image": "<base64>", "type": "GENERAL|BEFORE|AFTER"}`."""

    default_error_messages = {
        'invalid': 'Zdjęcie musi być tekstem base64 lub obiektem {image, type}.',
        'invalid_type': 'Nieznany typ zdjęcia. Dozwolone: GENERAL, BEFORE, AFTER.',
    }

    def to_internal_value(self, data):
        image_type = PostImage.Type.GENERAL
        if isinstance(data, dict):
            image_type = (data.get('type') or PostImage.Type.GENERAL)
            if image_type not in PostImage.Type.values:
                self.fail('invalid_type')
            data = data.get('image')
        if data in (None, ''):
            self.fail('invalid')
        image = Base64ImageField().run_validation(data)
        return {'image': image, 'type': image_type}

    def to_representation(self, value):  # pole tylko do zapisu
        return None


class PostSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_items = serializers.SerializerMethodField(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked_by_me = serializers.SerializerMethodField()
    is_bookmarked_by_me = serializers.SerializerMethodField()
    survey = serializers.SerializerMethodField(read_only=True)
    images = serializers.ListField(
        child=PostImageInputField(),
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
    assigned_team_lead = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='TEAM_LEAD', is_active=True),
        required=False,
        allow_null=True,
    )
    assigned_manager_detail = UserPublicSerializer(
        source='assigned_manager',
        read_only=True,
    )
    assigned_team_lead_detail = UserPublicSerializer(
        source='assigned_team_lead',
        read_only=True,
    )
    assigned_director_detail = UserPublicSerializer(
        source='assigned_director',
        read_only=True,
    )
    approvals = PostApprovalSerializer(many=True, read_only=True)
    current_stage = serializers.SerializerMethodField()
    can_update_progress = serializers.SerializerMethodField()
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
            'is_bookmarked_by_me',
            'images',
            'remove_images',
            'image_items',
            'image_urls',
            'survey',
            'assigned_manager',
            'assigned_team_lead',
            'assigned_manager_detail',
            'assigned_team_lead_detail',
            'assigned_director_detail',
            'estimated_cost',
            'deadline',
            'progress_percent',
            'approvals',
            'current_stage',
            'can_update_progress',
            'rejection_reason',
        ]
        # Pola ustawiane wyłącznie przez backend (głównie przez akcję `approve`/`progress`),
        # nie da się ich podać przy POST/PATCH zwykłego posta.
        read_only_fields = [
            'status',
            'rejection_reason',
            'progress_percent',
            'estimated_cost',
            'deadline',
        ]

    def get_likes_count(self, obj):
        value = getattr(obj, 'n_likes', None)
        return value if value is not None else obj.likes.count()

    def get_comments_count(self, obj):
        value = getattr(obj, 'n_comments', None)
        return value if value is not None else obj.comments.count()

    def get_is_liked_by_me(self, obj):
        annotated = getattr(obj, 'liked_by_me', None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_is_bookmarked_by_me(self, obj):
        annotated = getattr(obj, 'bookmarked_by_me', None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.bookmarks.filter(user=request.user).exists()
        return False

    def get_current_stage(self, obj):
        # Iteracja po (ew. prefetchowanych) etapach zamiast osobnego zapytania.
        pending = [
            a for a in obj.approvals.all()
            if a.decision == PostApproval.Decision.PENDING
        ]
        if not pending:
            return None
        pending.sort(key=lambda a: a.order)
        return PostApprovalSerializer(pending[0], context=self.context).data

    def get_can_update_progress(self, obj):
        from .services.approval import can_update_progress
        request = self.context.get('request')
        return bool(request) and can_update_progress(obj, request.user)

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
            items.append({'id': image.id, 'url': url, 'type': image.type})
        return items

    def get_survey(self, obj):
        survey = getattr(obj, 'survey', None)
        if not survey:
            return None
        return PostSurveySerializer(survey).data

    def validate_assigned_team_lead(self, lead):
        """Lider musi pochodzić z działu autora (zakres TEAM_LEAD = własny dział)."""
        if lead is None:
            return lead
        if self.instance is not None:
            author = self.instance.author
        else:
            request = self.context.get('request')
            author = getattr(request, 'user', None)
        if lead.role != 'TEAM_LEAD':
            raise serializers.ValidationError('Wskazana osoba nie jest liderem zespołu.')
        department_id = getattr(author, 'department_id', None)
        if not department_id or lead.department_id != department_id:
            raise serializers.ValidationError('Lider zespołu musi należeć do działu autora.')
        return lead

    def create(self, validated_data):
        images = validated_data.pop('images', [])
        validated_data.pop('remove_images', None)
        post = super().create(validated_data)
        for image in images:
            PostImage.objects.create(post=post, **image)
        return post

    def update(self, instance, validated_data):
        images = validated_data.pop('images', None)
        remove_images = validated_data.pop('remove_images', [])
        post = super().update(instance, validated_data)
        if remove_images:
            PostImage.objects.filter(post=post, id__in=remove_images).delete()
        if images:
            for image in images:
                PostImage.objects.create(post=post, **image)
        return post

class PostLightSerializer(serializers.ModelSerializer):
    """Lekka reprezentacja posta: kanban (pipeline), trendy, top pomysły."""

    author = UserPublicSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    savings = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    can_update_progress = serializers.SerializerMethodField()

    class Meta:
        model = KaizenPost
        fields = [
            'id',
            'title',
            'status',
            'author',
            'category',
            'category_name',
            'created_at',
            'likes_count',
            'comments_count',
            'progress_percent',
            'deadline',
            'estimated_cost',
            'savings',
            'assigned_manager',
            'thumbnail_url',
            'can_update_progress',
        ]
        read_only_fields = fields

    def get_likes_count(self, obj):
        value = getattr(obj, 'n_likes', None)
        return value if value is not None else obj.likes.count()

    def get_comments_count(self, obj):
        value = getattr(obj, 'n_comments', None)
        return value if value is not None else obj.comments.count()

    def get_savings(self, obj):
        survey = getattr(obj, 'survey', None)
        if not survey:
            return None
        return float(survey.estimated_financial_savings)

    def get_thumbnail_url(self, obj):
        images = [img for img in obj.images.all() if img.image]
        if not images:
            return None
        url = images[0].image.url
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_can_update_progress(self, obj):
        from .services.approval import can_update_progress
        request = self.context.get('request')
        if not request:
            return False
        return can_update_progress(obj, request.user)


class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ['id', 'user', 'post']
        read_only_fields = ['user']


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserPublicSerializer(read_only=True)
    post_id = serializers.IntegerField(source='post.id', read_only=True)
    # Tytuł i treść tylko dla posta, który odbiorca nadal może oglądać (inaczej null).
    post_title = serializers.SerializerMethodField()
    comment_id = serializers.IntegerField(source='comment.id', read_only=True)
    comment_text = serializers.SerializerMethodField()
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

    def _post_visible(self, obj):
        if obj.post_id is None:
            return False
        visible = getattr(obj, 'post_visible', None)
        if visible is None:
            # Fallback dla obiektu spoza NotificationViewSet (bez adnotacji `post_visible`).
            request = self.context.get('request')
            visible = request is not None and can_view_post(obj.post_id, request.user)
        return visible

    def get_post_title(self, obj):
        return obj.post.title if self._post_visible(obj) else None

    def get_comment_text(self, obj):
        if obj.comment_id is None or not self._post_visible(obj):
            return None
        return obj.comment.text


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

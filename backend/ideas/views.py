import logging
import re

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import KaizenPost, Comment, Like, PostSurvey, Notification, Category
from .serializers import (
    PostSerializer,
    CommentSerializer,
    LikeSerializer,
    PostSurveySerializer,
    PostSurveyInputSerializer,
    NotificationSerializer,
    CategorySerializer,
)
from .pagination import PostPagination
from .permissions import IsCommentAuthorOrReadOnly, IsPostAuthorOrReadOnly
from .services.post_survey_calculator import calculate_survey_results

logger = logging.getLogger(__name__)


def create_notification(notification_type, recipient, actor, post, comment=None):
    if not recipient or not actor or recipient == actor:
        return None
    return Notification.objects.create(
        type=notification_type,
        recipient=recipient,
        actor=actor,
        post=post,
        comment=comment,
    )


MENTION_REGEX = re.compile(r'@([A-Za-z0-9_\-]{2,50})')


def extract_mentions(text):
    """Zwraca posortowany set nicków bez duplikatów."""
    if not text:
        return []
    return list({match.group(1) for match in MENTION_REGEX.finditer(text)})


def notify_mentions(text, *, actor, post, comment, exclude_user_ids=None):
    nicks = extract_mentions(text)
    if not nicks:
        return
    User = get_user_model()
    excluded = set(exclude_user_ids or [])
    excluded.add(actor.id)
    mentioned = User.objects.filter(nickname__in=nicks).exclude(id__in=excluded)
    seen = set()
    for user in mentioned:
        if user.id in seen:
            continue
        seen.add(user.id)
        create_notification(Notification.Type.MENTION, user, actor, post, comment)


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsPostAuthorOrReadOnly]
    pagination_class = PostPagination

    def get_queryset(self):
        qs = KaizenPost.objects.all().order_by('-created_at')

        if self.action != 'list':
            return qs

        qs = qs.filter(
            status__in=[
                KaizenPost.Status.SUBMITTED,
                KaizenPost.Status.IN_PROGRESS,
                KaizenPost.Status.IMPLEMENTED,
            ]
        )

        params = self.request.query_params

        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search))

        category = params.get('category')
        if category:
            qs = qs.filter(category_id=category)

        status_param = params.get('status')
        allowed_statuses = {
            KaizenPost.Status.SUBMITTED,
            KaizenPost.Status.IN_PROGRESS,
            KaizenPost.Status.IMPLEMENTED,
        }
        if status_param and status_param in allowed_statuses:
            qs = qs.filter(status=status_param)

        author = params.get('author')
        if author:
            qs = qs.filter(author_id=author)

        if params.get('mine') in ('1', 'true', 'True') and self.request.user.is_authenticated:
            qs = qs.filter(author=self.request.user)

        ordering = params.get('ordering')
        if ordering == 'likes':
            qs = qs.annotate(_likes=Count('likes')).order_by('-_likes', '-created_at')

        return qs

    def get_permissions(self):
        if self.action == 'like':
            return [permissions.IsAuthenticated()]
        if self.action == 'comments':
            if self.request.method == 'POST':
                return [permissions.IsAuthenticated()]
            return [permissions.AllowAny()]
        if self.action == 'survey':
            if self.request.method in ['POST', 'PUT']:
                return [permissions.IsAuthenticated()]
            return [permissions.AllowAny()]
        if self.action in ('approve', 'reject', 'resubmit', 'my_cases'):
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        post = serializer.save(author=self.request.user)
        if post.assigned_manager:
            create_notification(
                Notification.Type.ASSIGNED,
                post.assigned_manager,
                self.request.user,
                post,
            )

    def perform_update(self, serializer):
        post = self.get_object()
        if post.status not in (KaizenPost.Status.TO_VERIFY, KaizenPost.Status.CANCELLED):
            raise PermissionDenied('Nie można edytować postów o tym statusie.')
        serializer.save()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        post = self.get_object()
        if post.assigned_manager != request.user:
            return Response(
                {'detail': 'Nie jesteś przypisanym kierownikiem.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if post.status != KaizenPost.Status.TO_VERIFY:
            return Response(
                {'detail': 'Tylko posty do weryfikacji mogą zostać zatwierdzone.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        post.status = KaizenPost.Status.SUBMITTED
        post.rejection_reason = None
        post.save(update_fields=['status', 'rejection_reason'])
        create_notification(Notification.Type.APPROVED, post.author, request.user, post)
        serializer = self.get_serializer(post)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        post = self.get_object()
        if post.assigned_manager != request.user:
            return Response(
                {'detail': 'Nie jesteś przypisanym kierownikiem.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if post.status != KaizenPost.Status.TO_VERIFY:
            return Response(
                {'detail': 'Tylko posty do weryfikacji mogą zostać odrzucone.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response(
                {'detail': 'Powód odrzucenia jest wymagany.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        post.status = KaizenPost.Status.CANCELLED
        post.rejection_reason = rejection_reason
        post.save(update_fields=['status', 'rejection_reason'])
        create_notification(Notification.Type.REJECTED, post.author, request.user, post)
        serializer = self.get_serializer(post)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def resubmit(self, request, pk=None):
        post = self.get_object()
        if post.author != request.user:
            return Response(
                {'detail': 'Tylko autor może ponownie zgłosić post.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if post.status != KaizenPost.Status.CANCELLED:
            return Response(
                {'detail': 'Tylko odrzucone posty mogą zostać ponownie zgłoszone.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        post.status = KaizenPost.Status.TO_VERIFY
        post.rejection_reason = None
        post.save(update_fields=['status', 'rejection_reason'])
        if post.assigned_manager:
            create_notification(
                Notification.Type.ASSIGNED,
                post.assigned_manager,
                request.user,
                post,
            )
        serializer = self.get_serializer(post)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_cases(self, request):
        user = request.user
        pending_statuses = [KaizenPost.Status.TO_VERIFY, KaizenPost.Status.CANCELLED]

        if getattr(user, 'role', None) == 'MANAGER':
            qs = KaizenPost.objects.filter(
                assigned_manager=user,
                status__in=pending_statuses,
            )
        else:
            qs = KaizenPost.objects.filter(
                author=user,
                status__in=pending_statuses,
            )

        qs = qs.order_by('-created_at')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        like_obj, created = Like.objects.get_or_create(post=post, user=user)

        if not created:
            like_obj.delete()
            return Response({
                'status': 'unliked',
                'likes_count': post.likes.count(),
                'is_liked_by_me': False,
            })
        create_notification(Notification.Type.LIKE, post.author, user, post)
        return Response({
            'status': 'liked',
            'likes_count': post.likes.count(),
            'is_liked_by_me': True,
        })

    @action(detail=True, methods=['post', 'get'])
    def comments(self, request, pk=None):
        post = self.get_object()
        if request.method == 'GET':
            comments = post.comments.all()
            serializer = CommentSerializer(comments, many=True, context={'request': request})
            return Response(serializer.data)
        elif request.method == 'POST':
            serializer = CommentSerializer(data=request.data, context={'request': request, 'post': post})
            if serializer.is_valid():
                comment = serializer.save(author=request.user, post=post)
                if comment.parent and comment.parent.author_id != request.user.id:
                    create_notification(
                        Notification.Type.REPLY,
                        comment.parent.author,
                        request.user,
                        post,
                        comment,
                    )
                else:
                    create_notification(
                        Notification.Type.COMMENT,
                        post.author,
                        request.user,
                        post,
                        comment,
                    )
                exclude_ids = {post.author_id}
                if comment.parent:
                    exclude_ids.add(comment.parent.author_id)
                notify_mentions(
                    comment.text,
                    actor=request.user,
                    post=post,
                    comment=comment,
                    exclude_user_ids=exclude_ids,
                )
                return Response(
                    CommentSerializer(comment, context={'request': request}).data,
                    status=status.HTTP_201_CREATED,
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post', 'put'])
    def survey(self, request, pk=None):
        post = self.get_object()

        if request.user != post.author:
            return Response({'detail': 'Brak uprawnień do ankiety.'}, status=status.HTTP_403_FORBIDDEN)

        existing_survey = getattr(post, 'survey', None)
        if request.method == 'POST' and existing_survey:
            return Response({'detail': 'Ankieta już istnieje.'}, status=status.HTTP_400_BAD_REQUEST)
        if request.method == 'PUT' and not existing_survey:
            return Response({'detail': 'Ankieta nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)

        input_serializer = PostSurveyInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        survey_payload = input_serializer.validated_data
        calculated = calculate_survey_results(**survey_payload)

        survey_values = {**survey_payload, **calculated}
        if existing_survey:
            for key, value in survey_values.items():
                setattr(existing_survey, key, value)
            existing_survey.save()
            survey = existing_survey
            response_status = status.HTTP_200_OK
        else:
            survey = PostSurvey.objects.create(post=post, **survey_values)
            response_status = status.HTTP_201_CREATED

        return Response(PostSurveySerializer(survey).data, status=response_status)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Category.objects.filter(is_active=True).order_by('name')


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all().order_by('-created_at')
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsCommentAuthorOrReadOnly]

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        create_notification(
            Notification.Type.COMMENT,
            comment.post.author,
            self.request.user,
            comment.post,
            comment
        )


class LikeViewSet(viewsets.ModelViewSet):
    queryset = Like.objects.all()
    serializer_class = LikeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                like = serializer.save(user=self.request.user)
                create_notification(Notification.Type.LIKE, like.post.author, self.request.user, like.post)
        except IntegrityError:
            raise ValidationError({
                "detail": "Już polubiłeś ten post! (Duplikat)"
            })


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Notification.objects.filter(recipient=self.request.user)
            .select_related('actor', 'post', 'comment')
            .order_by('-created_at')
        )

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=['read_at'])
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        now = timezone.now()
        updated = self.get_queryset().filter(read_at__isnull=True).update(read_at=now)
        return Response({'marked_count': updated})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(read_at__isnull=True).count()
        return Response({'count': count})

import logging
from django.db.models import Q
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


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsPostAuthorOrReadOnly]

    def get_queryset(self):
        qs = KaizenPost.objects.all().order_by('-created_at')
        user = self.request.user

        if self.action == 'list':
            if user.is_authenticated:
                qs = qs.filter(
                    Q(status__in=[
                        KaizenPost.Status.SUBMITTED,
                        KaizenPost.Status.IN_PROGRESS,
                        KaizenPost.Status.IMPLEMENTED,
                    ])
                    | Q(status=KaizenPost.Status.TO_VERIFY, author=user)
                    | Q(status=KaizenPost.Status.TO_VERIFY, assigned_manager=user)
                    | Q(status=KaizenPost.Status.CANCELLED, author=user)
                )
            else:
                qs = qs.exclude(
                    status__in=[KaizenPost.Status.TO_VERIFY, KaizenPost.Status.CANCELLED]
                )

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
        if getattr(request.user, 'role', None) != 'MANAGER':
            return Response(
                {'detail': 'Dostęp tylko dla kierowników.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = KaizenPost.objects.filter(
            assigned_manager=request.user,
        ).order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
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
            serializer = CommentSerializer(comments, many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            logger.info(
                '[comments] auth_header=%s user=%s',
                request.META.get('HTTP_AUTHORIZATION'),
                request.user
            )
            serializer = CommentSerializer(data=request.data)
            if serializer.is_valid():
                comment = serializer.save(author=request.user, post=post)
                create_notification(Notification.Type.COMMENT, post.author, request.user, post, comment)
                return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)
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

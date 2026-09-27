import logging
import re

from django.contrib.auth import get_user_model
from django.db.models import Count, Exists, F, OuterRef, Q, Subquery
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import KaizenPost, Comment, Like, PostSurvey, Notification, Category, Bookmark, PostApproval
from .serializers import (
    PostLightSerializer,
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
from access_control.permissions import IsManagement, is_admin
from .services.approval import (
    COST_THRESHOLD_DIRECTOR,
    approvals_queue,
    apply_manager_decision,
    current_pending_stage,
    director_required,
    init_approvals,
    is_active_approver,
    lock_post,
    process_decision,
)
from .services.post_survey_calculator import calculate_survey_results
from .services.queries import (
    annotate_post_visible,
    can_view_post,
    filter_post_list,
    trending as trending_ids,
    visible_to,
    with_counts,
    with_related,
)

logger = logging.getLogger(__name__)


_PARSE_ERROR = object()


def _parse_cost(value):
    if value in (None, ''):
        return None
    try:
        from decimal import Decimal
        return Decimal(str(value))
    except Exception:
        return None


def _parse_deadline(value):
    if value in (None, ''):
        return None
    from datetime import date
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return _PARSE_ERROR


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


# Nick 2-50 znaków: litery, cyfry, "_", "-" i kropki w środku (np. @dawid.baran).
# Nie może kończyć się kropką (kropka na końcu zdania), a "@" nie może być częścią adresu e-mail.
MENTION_REGEX = re.compile(r'(?<![A-Za-z0-9_.@-])@([A-Za-z0-9_-][A-Za-z0-9_.-]{0,48}[A-Za-z0-9_-])')


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
        # Wzmianka nie daje dostępu: kto nie może czytać posta (np. TO_VERIFY spoza łańcucha),
        # nie dostaje powiadomienia z tytułem i treścią komentarza.
        if not can_view_post(post.pk, user):
            continue
        create_notification(Notification.Type.MENTION, user, actor, post, comment)


ARRAY_LIMIT = 200


def array_or_page(view, qs):
    """Lista zgodna wstecz: bez `?page=` tablica (maks. ARRAY_LIMIT najnowszych),
    z `?page=` standardowa paginacja `{count, next, previous, results}`."""
    if 'page' in view.request.query_params:
        page = view.paginate_queryset(qs)
        serializer = view.get_serializer(page, many=True)
        return view.get_paginated_response(serializer.data)
    serializer = view.get_serializer(qs[:ARRAY_LIMIT], many=True)
    return Response(serializer.data)


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsPostAuthorOrReadOnly]
    pagination_class = PostPagination

    def get_queryset(self):
        user = self.request.user
        qs = with_counts(with_related(KaizenPost.objects.all()), user)
        if self.action != 'list':
            # retrieve i wszystkie akcje detail (comments, like, approve, ...) - ukryte statusy -> 404
            return visible_to(qs, user).order_by('-created_at')
        return filter_post_list(qs, self.request.query_params, user)

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
        if self.action in (
            'approve',
            'reject',
            'resubmit',
            'my_cases',
            'bookmark',
            'bookmarked',
            'progress',
            'approvals_queue',
            'approvals_queue_count',
            'trending',
        ):
            return [permissions.IsAuthenticated()]
        if self.action == 'pipeline':
            return [permissions.IsAuthenticated(), IsManagement()]
        return super().get_permissions()

    def perform_create(self, serializer):
        post = serializer.save(author=self.request.user)
        init_approvals(post)
        current = current_pending_stage(post)
        if current and current.approver_id:
            create_notification(
                Notification.Type.ASSIGNED,
                current.approver,
                self.request.user,
                post,
            )

    def perform_update(self, serializer):
        post = self.get_object()
        if post.status not in (KaizenPost.Status.TO_VERIFY, KaizenPost.Status.CANCELLED):
            raise PermissionDenied('Nie można edytować postów o tym statusie.')
        serializer.save()

    def _lock_for_decision(self, post, verb):
        """Blokuje post i dopiero wtedy sprawdza status oraz bieżącego approvera, więc z dwóch
        równoległych decyzji druga widzi skutek pierwszej. Wołać w `transaction.atomic()`.
        Zwraca `(zablokowany_post, odpowiedź_błędu_lub_None)`."""
        locked = lock_post(post.pk)
        if locked.status != KaizenPost.Status.TO_VERIFY:
            return locked, Response(
                {'detail': f'Tylko posty do weryfikacji mogą zostać {verb}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not is_active_approver(locked, self.request.user):
            return locked, Response(
                {'detail': 'Nie jesteś osobą wyznaczoną do akceptacji tego etapu.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return locked, None

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        post = self.get_object()
        # Sprawdzenie etapu, decyzja, zmiana statusu i powiadomienie w jednej transakcji.
        with transaction.atomic():
            post, error = self._lock_for_decision(post, 'zatwierdzone')
            return error or self._approve(request, post)

    def _approve(self, request, post):
        current = current_pending_stage(post)
        comment = request.data.get('comment')

        if current.stage == PostApproval.Stage.MANAGER:
            # Manager musi uzupełnić koszt i opcjonalnie termin.
            estimated_cost = _parse_cost(request.data.get('estimated_cost'))
            if estimated_cost is None:
                return Response(
                    {'detail': 'Podaj szacowany koszt wdrożenia.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            deadline = _parse_deadline(request.data.get('deadline'))
            if deadline is _PARSE_ERROR:
                return Response(
                    {'detail': 'deadline musi być w formacie YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            director = None
            director_id = request.data.get('assigned_director')
            if director_id:
                User = get_user_model()
                director = User.objects.filter(
                    id=director_id,
                    role='DIRECTOR',
                    is_active=True,
                ).first()
                if not director:
                    return Response(
                        {'detail': 'Wskazany dyrektor nie istnieje.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if director_required(estimated_cost) and not director:
                return Response(
                    {
                        'detail': (
                            f'Dla kosztu powyżej {COST_THRESHOLD_DIRECTOR} zł wymagane jest '
                            f'wskazanie dyrektora do akceptacji.'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                stage_obj, finished = apply_manager_decision(
                    post,
                    request.user,
                    PostApproval.Decision.APPROVED,
                    estimated_cost=estimated_cost,
                    deadline=deadline,
                    assigned_director=director,
                    comment=comment,
                )
            except ValueError as err:
                return Response({'detail': str(err)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            stage_obj, finished = process_decision(
                post,
                request.user,
                PostApproval.Decision.APPROVED,
                comment=comment,
            )

        if stage_obj is None:
            return Response(
                {'detail': 'Nie udało się przetworzyć decyzji.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if finished:
            create_notification(Notification.Type.APPROVED, post.author, request.user, post)
        else:
            next_stage = current_pending_stage(post)
            if next_stage and next_stage.approver_id:
                create_notification(
                    Notification.Type.ASSIGNED,
                    next_stage.approver,
                    request.user,
                    post,
                )
        serializer = self.get_serializer(self._fresh(post))
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        post = self.get_object()
        rejection_reason = (request.data.get('rejection_reason') or '').strip()
        with transaction.atomic():
            post, error = self._lock_for_decision(post, 'odrzucone')
            if error:
                return error
            if not rejection_reason:
                return Response(
                    {'detail': 'Powód odrzucenia jest wymagany.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            stage, _ = process_decision(
                post,
                request.user,
                PostApproval.Decision.REJECTED,
                comment=rejection_reason,
            )
            if stage is None:
                return Response(
                    {'detail': 'Nie udało się przetworzyć decyzji.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            create_notification(Notification.Type.REJECTED, post.author, request.user, post)
        serializer = self.get_serializer(self._fresh(post))
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def resubmit(self, request, pk=None):
        post = self.get_object()
        if post.author != request.user:
            return Response(
                {'detail': 'Tylko autor może ponownie zgłosić post.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Status, nowa ścieżka akceptacji i powiadomienie razem albo wcale: nikt nie zobaczy
        # TO_VERIFY ze starym lub pustym łańcuchem, a błąd nie zostawi posta bez etapów.
        with transaction.atomic():
            post = lock_post(post.pk)
            if post.status != KaizenPost.Status.CANCELLED:
                return Response(
                    {'detail': 'Tylko odrzucone posty mogą zostać ponownie zgłoszone.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            post.status = KaizenPost.Status.TO_VERIFY
            post.rejection_reason = None
            post.save(update_fields=['status', 'rejection_reason'])
            # Reset ścieżki akceptacji - nowe etapy zgodne z aktualnym kosztem.
            post.approvals.all().delete()
            init_approvals(post)
            current = current_pending_stage(post)
            if current and current.approver_id:
                create_notification(
                    Notification.Type.ASSIGNED,
                    current.approver,
                    request.user,
                    post,
                )
        serializer = self.get_serializer(self._fresh(post))
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_cases(self, request):
        user = request.user
        pending_statuses = [KaizenPost.Status.TO_VERIFY, KaizenPost.Status.CANCELLED]
        role = getattr(user, 'role', None)
        approver_roles = {'TEAM_LEAD', 'MANAGER', 'DIRECTOR'}

        if role in approver_roles:
            # Posty, gdzie user jest approverem bieżącego (pierwszego PENDING) etapu
            qs = approvals_queue(user)
        else:
            qs = KaizenPost.objects.filter(
                author=user,
                status__in=pending_statuses,
            )

        qs = with_counts(with_related(qs), user).order_by('-created_at')
        return array_or_page(self, qs)

    @action(detail=False, methods=['get'], url_path='approvals_queue')
    def approvals_queue(self, request):
        """Posty czekające na decyzję zalogowanego usera (bieżący etap PENDING).
        Filtr `stage=TEAM_LEAD|MANAGER|DIRECTOR`. Paginowane, najstarsze najpierw."""
        stage = self._stage_param(request)
        qs = approvals_queue(request.user, stage)
        qs = with_counts(with_related(qs), request.user).order_by('created_at', 'id')
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='approvals_queue/count')
    def approvals_queue_count(self, request):
        stage = self._stage_param(request)
        return Response({'count': approvals_queue(request.user, stage).count()})

    def _fresh(self, post):
        """Post po zmianie stanu, pobrany ponownie: `get_object()` ma prefetchowane etapy
        akceptacji i liczniki, więc serializacja starego obiektu zwróciłaby nieaktualne dane."""
        return with_counts(with_related(KaizenPost.objects.filter(pk=post.pk)), self.request.user).get()

    @staticmethod
    def _stage_param(request):
        stage = (request.query_params.get('stage') or '').upper().strip()
        return stage if stage in PostApproval.Stage.values else None

    @action(detail=False, methods=['get'])
    def pipeline(self, request):
        """Kanban wdrożeń (management): {SUBMITTED: [...], IN_PROGRESS: [...], IMPLEMENTED: [...]}.
        Filtry: `department` (dział autora), `category`, `mine_only` (tylko przypisane do mnie),
        `limit` (maks. elementów w kolumnie, domyślnie 100)."""
        params = request.query_params
        try:
            limit = max(1, min(int(params.get('limit', 100)), 500))
        except (TypeError, ValueError):
            limit = 100
        qs = KaizenPost.objects.select_related(
            'author__department', 'category', 'survey',
        ).prefetch_related('images')
        qs = qs.annotate(
            n_likes=Count('likes', distinct=True),
            n_comments=Count('comments', distinct=True),
        )
        if params.get('department'):
            qs = qs.filter(author__department_id=params.get('department'))
        if params.get('category'):
            qs = qs.filter(category_id=params.get('category'))
        if params.get('mine_only') in ('1', 'true', 'True'):
            qs = qs.filter(Q(assigned_manager=request.user) | Q(assigned_director=request.user))

        columns = {
            KaizenPost.Status.SUBMITTED: qs.order_by('-created_at'),
            KaizenPost.Status.IN_PROGRESS: qs.order_by(
                F('deadline').asc(nulls_last=True), '-progress_percent',
            ),
            KaizenPost.Status.IMPLEMENTED: qs.order_by('-created_at'),
        }
        context = self.get_serializer_context()
        return Response({
            key: PostLightSerializer(
                column.filter(status=key)[:limit], many=True, context=context,
            ).data
            for key, column in columns.items()
        })

    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Posty z największą liczbą lajków i komentarzy w ostatnich `days` (14) dniach."""
        try:
            limit = max(1, min(int(request.query_params.get('limit', 5)), 20))
        except (TypeError, ValueError):
            limit = 5
        try:
            days = max(1, min(int(request.query_params.get('days', 14)), 365))
        except (TypeError, ValueError):
            days = 14
        ids, scores = trending_ids(limit=limit, days=days)
        posts = {
            p.id: p
            for p in KaizenPost.objects.filter(id__in=ids)
            .select_related('author__department', 'category', 'survey')
            .prefetch_related('images')
            .annotate(n_likes=Count('likes', distinct=True), n_comments=Count('comments', distinct=True))
        }
        data = []
        context = self.get_serializer_context()
        for post_id in ids:
            post = posts.get(post_id)
            if post is None:
                continue
            row = PostLightSerializer(post, context=context).data
            row['score'] = scores.get(post_id, 0)
            data.append(row)
        return Response(data)

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

    @action(detail=True, methods=['post'])
    def bookmark(self, request, pk=None):
        post = self.get_object()
        user = request.user
        bookmark_obj, created = Bookmark.objects.get_or_create(post=post, user=user)

        if not created:
            bookmark_obj.delete()
            return Response({
                'status': 'unbookmarked',
                'is_bookmarked_by_me': False,
            })
        return Response({
            'status': 'bookmarked',
            'is_bookmarked_by_me': True,
        })

    @action(detail=False, methods=['get'])
    def bookmarked(self, request):
        user = request.user
        own_bookmarks = Bookmark.objects.filter(post=OuterRef('pk'), user=user)
        qs = KaizenPost.objects.filter(Exists(own_bookmarks)).annotate(
            bookmarked_at=Subquery(own_bookmarks.values('created_at')[:1]),
        )
        # Zakładka nie daje dostępu: pomysł, którego user już nie może oglądać, znika z listy.
        qs = visible_to(with_counts(with_related(qs), user), user).order_by('-bookmarked_at', '-id')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def progress(self, request, pk=None):
        """
        Aktualizacja stanu wdrożenia (postęp + termin) przez przypisanego managera.
        Payload: {progress_percent?, deadline?}. progress=100 ustawia IMPLEMENTED,
        progress>0 przy SUBMITTED ustawia IN_PROGRESS.
        """
        post = self.get_object()
        if not (
            post.assigned_manager_id == request.user.id
            or post.assigned_director_id == request.user.id
            or is_admin(request.user)
        ):
            return Response(
                {'detail': 'Tylko przypisany kierownik może aktualizować postęp.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if post.status not in (KaizenPost.Status.SUBMITTED, KaizenPost.Status.IN_PROGRESS, KaizenPost.Status.IMPLEMENTED):
            return Response(
                {'detail': 'Post nie jest jeszcze w fazie wdrożenia.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        update_fields = []
        if 'progress_percent' in request.data:
            try:
                value = int(request.data.get('progress_percent'))
            except (TypeError, ValueError):
                return Response(
                    {'detail': 'progress_percent musi być liczbą całkowitą 0-100.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not 0 <= value <= 100:
                return Response(
                    {'detail': 'progress_percent musi być w zakresie 0-100.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if value < 100 and post.status == KaizenPost.Status.IMPLEMENTED:
                return Response(
                    {'detail': 'Pomysł jest już wdrożony - nie można zmniejszyć postępu poniżej 100%.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            post.progress_percent = value
            update_fields.append('progress_percent')
            if value == 100 and post.status != KaizenPost.Status.IMPLEMENTED:
                post.status = KaizenPost.Status.IMPLEMENTED
                update_fields.append('status')
            elif 0 < value < 100 and post.status == KaizenPost.Status.SUBMITTED:
                post.status = KaizenPost.Status.IN_PROGRESS
                update_fields.append('status')

        if 'deadline' in request.data:
            deadline_value = request.data.get('deadline')
            if deadline_value in (None, ''):
                post.deadline = None
            else:
                from datetime import date
                try:
                    post.deadline = date.fromisoformat(str(deadline_value))
                except ValueError:
                    return Response(
                        {'detail': 'deadline musi być w formacie YYYY-MM-DD.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            update_fields.append('deadline')

        if not update_fields:
            return Response(
                {'detail': 'Brak pól do aktualizacji.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        post.save(update_fields=update_fields)
        serializer = self.get_serializer(self._fresh(post))
        return Response(serializer.data)

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
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsCommentAuthorOrReadOnly]

    def get_queryset(self):
        # Tylko komentarze pod postami, które zalogowany może oglądać.
        visible_posts = visible_to(KaizenPost.objects.all(), self.request.user).values('pk')
        return (
            Comment.objects.filter(post__in=visible_posts)
            .select_related('author__department')
            .order_by('-created_at')
        )

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
    serializer_class = LikeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _visible_posts(self):
        return visible_to(KaizenPost.objects.all(), self.request.user).values('pk')

    def get_queryset(self):
        return Like.objects.filter(post__in=self._visible_posts())

    def perform_create(self, serializer):
        post = serializer.validated_data.get('post')
        if post is None or not KaizenPost.objects.filter(pk=post.pk, pk__in=self._visible_posts()).exists():
            raise ValidationError({'post': ['Nie znaleziono pomysłu.']})
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
    pagination_class = PostPagination

    def list(self, request, *args, **kwargs):
        return array_or_page(self, self.get_queryset())

    def get_queryset(self):
        user = self.request.user
        qs = (
            Notification.objects.filter(recipient=user)
            .select_related('actor__department', 'post', 'comment')
            .order_by('-created_at')
        )
        # Uprawnienia zmieniają się w czasie (np. resubmit z innym liderem) - treść posta, którego
        # odbiorca już nie widzi, jest ukrywana przy odczycie (NotificationSerializer).
        return annotate_post_visible(qs, user)

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

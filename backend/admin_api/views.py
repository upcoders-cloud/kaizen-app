"""
Panel administracji (`/api/admin/`). Wszystkie endpointy tylko dla admina
(is_staff lub is_superuser). Listy `users/` i `redemptions/` są paginowane,
pozostałe słowniki zwracają zwykłe tablice.
"""
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from access_control.permissions import IsAdmin
from gamification.models import Action, Badge, Level, PointRule, Reward, RewardRedemption
from gamification.serializers import PointTransactionSerializer
from gamification.services import engine
from gamification.services.rewards import RedemptionConflict, set_status
from ideas.models import Category, KaizenPost
from ideas.pagination import PostPagination
from users.models import Department
from .serializers import (
    AdjustPointsSerializer,
    AdminBadgeSerializer,
    AdminCategorySerializer,
    AdminDepartmentSerializer,
    AdminLevelSerializer,
    AdminPointRuleSerializer,
    AdminRedemptionSerializer,
    AdminRewardSerializer,
    AdminUserSerializer,
    RedemptionActionSerializer,
    SetPasswordSerializer,
)

User = get_user_model()
TRUTHY = ('1', 'true', 'True')
FALSY = ('0', 'false', 'False')


def _bool_param(value):
    if value in TRUTHY:
        return True
    if value in FALSY:
        return False
    return None


class AdminViewSetMixin:
    permission_classes = [IsAuthenticated, IsAdmin]


class AdminUserViewSet(AdminViewSetMixin, viewsets.ModelViewSet):
    """CRUD użytkowników. DELETE = dezaktywacja konta (dane zostają)."""
    serializer_class = AdminUserSerializer
    pagination_class = PostPagination

    def get_queryset(self):
        qs = User.objects.select_related('department', 'gamification')
        params = self.request.query_params
        search = (params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(nickname__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )
        role = (params.get('role') or '').upper().strip()
        if role:
            qs = qs.filter(role=role)
        department = params.get('department')
        if department == 'none':
            qs = qs.filter(department__isnull=True)
        elif department:
            qs = qs.filter(department_id=department)
        for field in ('is_active', 'is_staff'):
            value = _bool_param(params.get(field))
            if value is not None:
                qs = qs.filter(**{field: value})
        return qs.order_by('last_name', 'first_name', 'username')

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response(
                {'detail': 'Nie możesz dezaktywować własnego konta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        user = self.get_object()
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Hasło zostało zmienione.'})

    @action(detail=True, methods=['post'])
    def adjust_points(self, request, pk=None):
        user = self.get_object()
        serializer = AdjustPointsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        txn = engine.award(
            user,
            Action.MANUAL_ADJUSTMENT,
            points_override=serializer.validated_data['points'],
            metadata={
                'reason': serializer.validated_data['reason'],
                'by_user': request.user.id,
                'by_username': request.user.username,
            },
        )
        profile = engine.get_or_create_profile(user)
        profile.refresh_from_db()
        return Response(
            {
                'transaction': PointTransactionSerializer(txn).data if txn else None,
                'total_points': profile.total_points,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminDepartmentViewSet(AdminViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AdminDepartmentSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Department.objects.select_related('lead')
            .annotate(member_count=Count('members', filter=Q(members__is_active=True)))
            .order_by('name')
        )


class AdminCategoryViewSet(AdminViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AdminCategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(post_count=Count('kaizenpost')).order_by('name')

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if KaizenPost.objects.filter(category=category).exists():
            return Response(
                {'detail': 'Kategoria ma przypisane pomysły. Dezaktywuj ją zamiast usuwać.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminRewardViewSet(AdminViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AdminRewardSerializer
    pagination_class = None

    def get_queryset(self):
        return Reward.objects.annotate(redemption_count=Count('redemptions')).order_by('order', 'cost_points')

    def destroy(self, request, *args, **kwargs):
        reward = self.get_object()
        if reward.redemptions.exists():
            return Response(
                {'detail': 'Nagroda ma historię wymian. Dezaktywuj ją zamiast usuwać.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reward.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminRedemptionViewSet(AdminViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """Kolejka wymian nagród. Akcje: approve, deliver, reject (reject zwraca punkty)."""
    serializer_class = AdminRedemptionSerializer
    pagination_class = PostPagination

    def get_queryset(self):
        qs = RewardRedemption.objects.select_related(
            'user__department', 'reward', 'handled_by__department',
        )
        params = self.request.query_params
        status_param = (params.get('status') or '').upper().strip()
        if status_param:
            qs = qs.filter(status__in=[s for s in status_param.split(',') if s])
        if params.get('user'):
            qs = qs.filter(user_id=params.get('user'))
        return qs.order_by('-created_at')

    def get_serializer_context(self):
        # Liczniki wymian dla zagnieżdżonych nagród jednym zapytaniem (bez N+1).
        context = super().get_serializer_context()
        context['reward_redemption_counts'] = dict(
            Reward.objects.annotate(n=Count('redemptions')).values_list('id', 'n')
        )
        return context

    def _transition(self, request, target):
        redemption = self.get_object()
        serializer = RedemptionActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            set_status(redemption.id, target, request.user, serializer.validated_data.get('note', ''))
        except RedemptionConflict as err:
            return Response({'detail': str(err)}, status=status.HTTP_409_CONFLICT)
        return Response(self.get_serializer(self.get_queryset().get(pk=redemption.pk)).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        return self._transition(request, RewardRedemption.Status.APPROVED)

    @action(detail=True, methods=['post'])
    def deliver(self, request, pk=None):
        return self._transition(request, RewardRedemption.Status.DELIVERED)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return self._transition(request, RewardRedemption.Status.REJECTED)


class AdminPointRuleViewSet(
    AdminViewSetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AdminPointRuleSerializer
    pagination_class = None
    queryset = PointRule.objects.order_by('id')


class AdminBadgeViewSet(AdminViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AdminBadgeSerializer
    pagination_class = None

    def get_queryset(self):
        return Badge.objects.annotate(awarded_count=Count('awarded_to')).order_by('order', 'threshold')


class AdminLevelViewSet(AdminViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AdminLevelSerializer
    pagination_class = None
    queryset = Level.objects.order_by('order', 'min_points')


class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({
            'active_users': User.objects.filter(is_active=True).count(),
            'total_users': User.objects.count(),
            'admins': User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).count(),
            'pending_redemptions': RewardRedemption.objects.filter(
                status=RewardRedemption.Status.PENDING,
            ).count(),
            'categories': Category.objects.filter(is_active=True).count(),
            'departments': Department.objects.filter(is_active=True).count(),
            'active_rewards': Reward.objects.filter(is_active=True).count(),
            'active_badges': Badge.objects.filter(is_active=True).count(),
            'posts': KaizenPost.objects.count(),
            'pending_approvals': KaizenPost.objects.filter(status=KaizenPost.Status.TO_VERIFY).count(),
        })

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Reward, RewardRedemption
from .serializers import (
    LeaderboardCategorySerializer,
    LeaderboardDepartmentSerializer,
    LeaderboardUserSerializer,
    MeGamificationSerializer,
    PointTransactionSerializer,
    RewardRedemptionSerializer,
    RewardSerializer,
)
from .services import badges as badges_service
from .services import leaderboard as lb
from .services import levels as levels_service
from .services.engine import get_or_create_profile
from .services.rewards import RewardError, redeem


class MeGamificationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = get_or_create_profile(user)
        progress = levels_service.level_progress(profile.total_points)
        data = {
            'points': profile.total_points,
            'rank': lb.user_rank(user),
            'current_streak': profile.current_streak,
            'longest_streak': profile.longest_streak,
            'level': progress['current'],
            'next_level': progress['next'],
            'level_progress': progress['progress'],
            'points_to_next': progress['to_next'],
            'badges': badges_service.badge_progress(user, profile),
        }
        return Response(MeGamificationSerializer(data, context={'request': request}).data)


class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', lb.PERIOD_ALL)
        scope = request.query_params.get('scope', 'users')
        try:
            limit = min(int(request.query_params.get('limit', 20)), 100)
        except (TypeError, ValueError):
            limit = 20

        if scope == 'categories':
            rows = lb.top_categories(period, limit)
            return Response(LeaderboardCategorySerializer(rows, many=True).data)
        if scope == 'departments':
            rows = lb.top_departments(period, limit)
            return Response(LeaderboardDepartmentSerializer(rows, many=True).data)

        rows = lb.top_users(period, limit)
        return Response(
            LeaderboardUserSerializer(rows, many=True, context={'request': request}).data
        )


class RewardViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RewardSerializer

    def get_queryset(self):
        return Reward.objects.filter(is_active=True).order_by('order', 'cost_points')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        profile = get_or_create_profile(self.request.user)
        ctx['user_points'] = profile.total_points
        return ctx

    @action(detail=True, methods=['post'])
    def redeem(self, request, pk=None):
        try:
            redemption = redeem(request.user, pk)
        except RewardError as err:
            return Response({'detail': str(err)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            RewardRedemptionSerializer(redemption).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='my-redemptions')
    def my_redemptions(self, request):
        qs = (
            RewardRedemption.objects
            .filter(user=request.user)
            .select_related('reward')
            .order_by('-created_at')
        )
        return Response(RewardRedemptionSerializer(qs, many=True).data)


class MyTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = request.user.point_transactions.all()[:100]
        return Response(PointTransactionSerializer(qs, many=True).data)

from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from access_control.permissions import IsApprover, IsManagement, is_management
from ideas.serializers import PostLightSerializer
from .services import exporters, insights, metrics
from .services.filters import AnalyticsFilters


def _filters(request):
    return AnalyticsFilters.from_params(request.query_params)


def _limit(request, default=10, maximum=50):
    try:
        return max(1, min(int(request.query_params.get('limit', default)), maximum))
    except (TypeError, ValueError):
        return default


class OverviewView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        return Response(metrics.overview(_filters(request).posts()))


class DepartmentsView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        return Response(metrics.departments(_filters(request).posts()))


class CategoriesView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        return Response(metrics.categories(_filters(request).posts()))


class TrendsView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        granularity = request.query_params.get('granularity', 'month')
        if granularity not in ('month', 'quarter'):
            granularity = 'month'
        filters = _filters(request)
        return Response(metrics.trends(
            granularity=granularity,
            base_qs=filters.posts(),
            date_from=filters.date_from,
        ))


class ApprovalsView(APIView):
    """Lejek i SLA akceptacji."""
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        return Response(insights.approvals(_filters(request).posts()))


class TopIdeasView(APIView):
    """Top pomysły wg `by=savings|likes|comments`. Bez filtra `status`: tylko zaakceptowane."""
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        filters = _filters(request)
        posts = filters.posts()
        if not filters.status:
            posts = posts.filter(status__in=insights.PUBLIC_STATUSES)
        by = request.query_params.get('by', 'savings')
        rows = insights.top_ideas(posts, by=by, limit=_limit(request))
        data = PostLightSerializer(rows, many=True, context={'request': request}).data
        for row in data:
            row['department'] = row['author'].get('department_name') if row.get('author') else None
        return Response(data)


class TeamView(APIView):
    """Mój zespół: dział zalogowanego (TEAM_LEAD i wyżej); management może wskazać `?department=`."""
    permission_classes = [IsAuthenticated, IsApprover]

    def get(self, request):
        from users.models import Department

        filters = _filters(request)
        department = None
        if filters.department and is_management(request.user):
            department = Department.objects.filter(id=filters.department).select_related('lead').first()
            if department is None:
                return Response({'detail': 'Nie znaleziono działu.'}, status=404)
        else:
            department = request.user.department
        if department is None:
            return Response(
                {'detail': 'Nie masz przypisanego działu. Wskaż dział parametrem department.'},
                status=400,
            )

        # Filtr działu w AnalyticsFilters nie dotyczy tu postów - zakres wyznacza `department`.
        filters.department = None
        posts = filters.posts()
        data = insights.team(department, posts)
        data['ideas_in_progress'] = PostLightSerializer(
            insights.team_ideas_in_progress(department, posts),
            many=True,
            context={'request': request},
        ).data
        return Response(data)


class ParticipationView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        return Response(insights.participation(_filters(request)))


class HeatmapView(APIView):
    """Heatmapa aktywności. Domyślnie własna; management może podać ?user=<id>."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.contrib.auth import get_user_model

        try:
            year = int(request.query_params.get('year', ''))
        except (TypeError, ValueError):
            from django.utils import timezone
            year = timezone.now().year

        target = request.user
        user_param = request.query_params.get('user')
        if user_param and user_param != 'me':
            if not is_management(request.user):
                return Response(
                    {'detail': 'Brak uprawnień do cudzej heatmapy.'}, status=403
                )
            User = get_user_model()
            target = User.objects.filter(id=user_param).first() or request.user

        return Response(metrics.activity_heatmap(target, year))


class MyImpactView(APIView):
    """Mój wkład - dostępne dla każdego zalogowanego."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(metrics.me_impact(request.user))


class ExportView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    CONTENT_TYPES = {
        'csv': 'text/csv',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }

    def get(self, request):
        # Uwaga: NIE używamy parametru `format` - koliduje z DRF
        # URL_FORMAT_OVERRIDE (content negotiation). Stąd `fmt`.
        report = request.query_params.get('report', 'overview')
        fmt = request.query_params.get('fmt', 'csv')
        if fmt not in self.CONTENT_TYPES:
            return Response({'detail': 'Parametr fmt: csv lub xlsx.'}, status=400)
        filters = _filters(request)
        try:
            if fmt == 'csv':
                payload = exporters.to_csv(report, filters)
            else:
                payload = exporters.to_xlsx(report, filters)
        except ValueError as err:
            return Response({'detail': str(err)}, status=400)

        resp = HttpResponse(payload, content_type=self.CONTENT_TYPES[fmt])
        resp['Content-Disposition'] = (
            f'attachment; filename="kaizen-{report}.{fmt}"'
        )
        return resp

from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsManagement, is_management
from .services import exporters, metrics


class OverviewView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        return Response(metrics.overview())


class DepartmentsView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        return Response(metrics.departments())


class CategoriesView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        return Response(metrics.categories())


class TrendsView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        granularity = request.query_params.get('granularity', 'month')
        if granularity not in ('month', 'quarter'):
            granularity = 'month'
        return Response(metrics.trends(granularity=granularity))


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
    """Mój wkład — dostępne dla każdego zalogowanego."""
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
        # Uwaga: NIE używamy parametru `format` — koliduje z DRF
        # URL_FORMAT_OVERRIDE (content negotiation). Stąd `fmt`.
        report = request.query_params.get('report', 'overview')
        fmt = request.query_params.get('fmt', 'csv')
        if fmt not in self.CONTENT_TYPES:
            return Response({'detail': 'Parametr fmt: csv lub xlsx.'}, status=400)
        try:
            if fmt == 'csv':
                payload = exporters.to_csv(report)
            else:
                payload = exporters.to_xlsx(report)
        except ValueError as err:
            return Response({'detail': str(err)}, status=400)

        resp = HttpResponse(payload, content_type=self.CONTENT_TYPES[fmt])
        resp['Content-Disposition'] = (
            f'attachment; filename="kaizen-{report}.{fmt}"'
        )
        return resp

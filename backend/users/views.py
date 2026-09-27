from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from access_control.permissions import APPROVER_ROLES
from ideas.pagination import PostPagination
from .models import CustomUser, Department
from .serializers import DepartmentSerializer, UserPublicSerializer, UserMeSerializer, UserProfileSerializer


def _apply_search(qs, search):
    search = (search or '').strip()
    if not search:
        return qs
    return qs.filter(
        Q(first_name__icontains=search)
        | Q(last_name__icontains=search)
        | Q(nickname__icontains=search)
        | Q(username__icontains=search)
    )


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    list:     publiczna lista aktywnych użytkowników (paginowana),
              filtry `search`, `department`, `role`.
    retrieve: profil publiczny ze statystykami i gamifikacją.
    """
    serializer_class = UserPublicSerializer
    pagination_class = PostPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CustomUser.objects.select_related('department')
        if self.action != 'list':
            return qs
        qs = qs.filter(is_active=True)
        params = self.request.query_params
        qs = _apply_search(qs, params.get('search'))
        department = params.get('department')
        if department:
            qs = qs.filter(department_id=department)
        role = (params.get('role') or '').upper().strip()
        if role:
            qs = qs.filter(role=role)
        return qs.order_by('last_name', 'first_name', 'username')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserProfileSerializer
        return super().get_serializer_class()

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        if request.method == 'GET':
            serializer = UserMeSerializer(request.user, context={'request': request})
            return Response(serializer.data)

        serializer = UserMeSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def managers(self, request):
        """Lista użytkowników z rolą zatwierdzającą.
        Domyślnie zwraca samych MANAGER'ów (back-compat). Parametr `role`
        pozwala wskazać TEAM_LEAD lub DIRECTOR.
        """
        role_param = (request.query_params.get('role') or '').upper().strip()
        role = role_param if role_param in APPROVER_ROLES else CustomUser.Role.MANAGER

        managers = CustomUser.objects.filter(role=role, is_active=True).select_related('department')
        managers = _apply_search(managers, request.query_params.get('search'))
        serializer = UserPublicSerializer(managers, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def approvers(self, request):
        """Wszyscy aktywni użytkownicy z rolą approvera (TEAM_LEAD/MANAGER/DIRECTOR).
        Filtry: `role` (jedna z ról approvera), `department`, `search`. Bez paginacji.
        """
        qs = CustomUser.objects.filter(role__in=APPROVER_ROLES, is_active=True).select_related('department')
        role = (request.query_params.get('role') or '').upper().strip()
        if role in APPROVER_ROLES:
            qs = qs.filter(role=role)
        department = request.query_params.get('department')
        if department:
            qs = qs.filter(department_id=department)
        qs = _apply_search(qs, request.query_params.get('search'))
        qs = qs.order_by('role', 'last_name', 'first_name')
        serializer = UserPublicSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


class DepartmentViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Słownik aktywnych działów do filtrów (tablica `{id, name}`, bez paginacji)."""
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Department.objects.filter(is_active=True).order_by('name')

from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import CustomUser
from .serializers import UserPublicSerializer, UserMeSerializer


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserPublicSerializer

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
        approver_roles = {
            CustomUser.Role.TEAM_LEAD,
            CustomUser.Role.MANAGER,
            CustomUser.Role.DIRECTOR,
        }
        role = role_param if role_param in approver_roles else CustomUser.Role.MANAGER

        managers = CustomUser.objects.filter(role=role, is_active=True)
        search = request.query_params.get('search', '').strip()
        if search:
            managers = managers.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(nickname__icontains=search)
            )
        serializer = UserPublicSerializer(managers, many=True, context={'request': request})
        return Response(serializer.data)

from django.shortcuts import render

# Create your views here.
# backend/users/views.py

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import CustomUser
from .serializers import UserPublicSerializer # Upewnij się, że masz ten serializer w users/serializers.py

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    # ReadOnlyModelViewSet = pozwala tylko czytać (GET), nie pozwala usuwać/dodawać userów przez API
    queryset = CustomUser.objects.all()
    serializer_class = UserPublicSerializer

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
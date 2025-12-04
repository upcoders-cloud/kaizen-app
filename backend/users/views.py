from django.shortcuts import render

# Create your views here.
# backend/users/views.py

from rest_framework import viewsets
from .models import CustomUser
from .serializers import UserPublicSerializer # Upewnij się, że masz ten serializer w users/serializers.py

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    # ReadOnlyModelViewSet = pozwala tylko czytać (GET), nie pozwala usuwać/dodawać userów przez API
    queryset = CustomUser.objects.all()
    serializer_class = UserPublicSerializer
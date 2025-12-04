from rest_framework import serializers
from django.contrib.auth import get_user_model

# Pobieramy Twój model użytkownika (CustomUser) w bezpieczny sposób
User = get_user_model()

class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Wymieniamy tylko te pola, które aplikacja może widzieć.
        # Nie ma tu 'email', 'first_name', 'microsoft_oid'.
        fields = ['id', 'nickname', 'is_staff']
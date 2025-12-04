from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

# Wyswietlenie CustomUser używając wbudowanego wyglądu UserAdmin
admin.site.register(CustomUser, UserAdmin)

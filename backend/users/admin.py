from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('name',)


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'department', 'is_staff')
    list_filter = ('role', 'department', 'is_staff', 'is_active')
    search_fields = ('username', 'nickname', 'first_name', 'last_name', 'email')
    fieldsets = UserAdmin.fieldsets + (
        ('Kaizen', {'fields': ('nickname', 'microsoft_oid', 'is_verified', 'gender', 'role', 'department', 'avatar')}),
    )

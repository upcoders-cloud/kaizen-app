from rest_framework.permissions import BasePermission

MANAGEMENT_ROLES = {'MANAGER', 'DIRECTOR'}


def is_management(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    return getattr(user, 'role', None) in MANAGEMENT_ROLES


class IsManagement(BasePermission):
    """Dostęp do analityki org-wide tylko dla ról zarządczych / admina."""
    message = 'Analityka organizacji dostępna tylko dla kierownictwa.'

    def has_permission(self, request, view):
        return is_management(request.user)

"""
Wspólne helpery i klasy uprawnień opartych o rolę użytkownika.

- admin      = is_staff lub is_superuser (niezależnie od roli)
- approver   = TEAM_LEAD / MANAGER / DIRECTOR lub admin
- management = MANAGER / DIRECTOR lub admin
"""
from rest_framework.permissions import BasePermission

APPROVER_ROLES = {'TEAM_LEAD', 'MANAGER', 'DIRECTOR'}
MANAGEMENT_ROLES = {'MANAGER', 'DIRECTOR'}


def _authenticated(user):
    return bool(user and user.is_authenticated)


def is_admin(user):
    return _authenticated(user) and bool(user.is_staff or user.is_superuser)


def is_approver(user):
    if not _authenticated(user):
        return False
    return is_admin(user) or getattr(user, 'role', None) in APPROVER_ROLES


def is_management(user):
    if not _authenticated(user):
        return False
    return is_admin(user) or getattr(user, 'role', None) in MANAGEMENT_ROLES


def permissions_payload(user):
    return {
        'is_admin': is_admin(user),
        'is_approver': is_approver(user),
        'is_management': is_management(user),
    }


class IsAdmin(BasePermission):
    message = 'Ta operacja jest dostępna tylko dla administratora.'

    def has_permission(self, request, view):
        return is_admin(request.user)


class IsApprover(BasePermission):
    message = 'Ta operacja jest dostępna tylko dla osób akceptujących pomysły.'

    def has_permission(self, request, view):
        return is_approver(request.user)


class IsManagement(BasePermission):
    message = 'Analityka organizacji dostępna tylko dla kierownictwa.'

    def has_permission(self, request, view):
        return is_management(request.user)

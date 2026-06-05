from rest_framework.permissions import BasePermission
from .roles import UserRole


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and request.user.role == UserRole.ADMIN.value
        )


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.SUPER_ADMIN.value
        )


class CanCrudTasks(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == UserRole.ADMIN.value:
            return True
        if request.user.role == UserRole.TEAM_MEMBER.value and request.user.can_crud_tasks:
            return True
        return False


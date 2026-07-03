import os
import datetime
from datetime import timedelta
from dotenv import load_dotenv
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Q, Count, Avg, F, Sum
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from core.cache_utils import make_cache_key
from .serializers import (
    LoginSerializer,
    CreateAdminSerializer,
    CreateTeamLeaderSerializer,
    UpdateTeamMemberSerializer,
    UpdateAdminSerializer,
    TaskCreateSerializer,
    TaskListSerializer,
    TaskStatusUpdateSerializer,
    TimesheetCreateSerializer,
    TimesheetUpdateSerializer,
    TimesheetListSerializer,
    TaskCommentSerializer,
    SubTaskSerializer,
    TaskDetailSerializer,
    NotificationSerializer,
    AnnouncementCreateSerializer,
    AnnouncementUpdateSerializer,
    AnnouncementListSerializer,
    EmployeeScorecardSerializer,
    EmployeeScorecardCreateUpdateSerializer,
)
from .permissions import IsAdmin, IsSuperAdmin, CanCrudTasks
from .roles import UserRole
from .response import success_response, error_response
from .pagination import CustomPagination
from .models import (
    Task,
    Timesheet,
    TaskComment,
    SubTask,
    Notification,
    Announcement,
    AnnouncementAudience,
    TaskStatus,
    EmployeeScorecard,
    ScorecardStatus,
)

load_dotenv()

User = get_user_model()


def get_tokens(user):
    refresh = RefreshToken.for_user(user)

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class SuperAdminLoginView(APIView):

    def post(self, request):

        username = request.data.get("username")
        password = request.data.get("password")

        env_username = os.getenv("SUPER_ADMIN_USERNAME")
        env_password = os.getenv("SUPER_ADMIN_PASSWORD")

        if username != env_username or password != env_password:

            return error_response(
                message="Invalid super admin credentials",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        user, created = User.objects.get_or_create(
            username=username, defaults={"role": UserRole.SUPER_ADMIN.value}
        )

        if created:
            user.set_password(password)
            user.save()

        tokens = get_tokens(user)

        return success_response(
            message="Super admin login successful",
            data={
                "role": user.role,
                "tokens": tokens,
            },
            status_code=status.HTTP_200_OK,
        )


class LoginView(APIView):

    def post(self, request):

        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():

            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.validated_data["user"]

        tokens = get_tokens(user)

        return success_response(
            message="Login successful",
            data={
                "role": user.role,
                "tokens": tokens,
            },
            status_code=status.HTTP_200_OK,
        )


class CreateAdminView(APIView):

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):

        serializer = CreateAdminSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():

            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        admin_user = serializer.save()

        return success_response(
            message="Admin created successfully",
            data={
                "id": admin_user.id,
                "username": admin_user.username,
                "role": admin_user.role,
            },
            status_code=status.HTTP_201_CREATED,
        )


class CreateTeamLeaderView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):

        serializer = CreateTeamLeaderSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():

            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        team_leader = serializer.save()

        return success_response(
            message="Team leader created successfully",
            data={
                "id": team_leader.id,
                "username": team_leader.username,
                "role": team_leader.role,
            },
            status_code=status.HTTP_201_CREATED,
        )


class ProfileView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success_response(
            message="Profile fetched successfully",
            data={
                "id": request.user.id,
                "username": request.user.username,
                "role": request.user.role,
                "name": getattr(request.user, "name", "") or "",
                "employee_id": getattr(request.user, "employee_id", "") or "",
                "profile_picture": getattr(request.user, "profile_picture", "") or "",
                "can_crud_tasks": getattr(request.user, "can_crud_tasks", False),
            },
            status_code=status.HTTP_200_OK,
        )

    def put(self, request):
        user = request.user
        name = request.data.get("name")
        employee_id = request.data.get("employee_id")
        profile_picture = request.data.get("profile_picture")
        password = request.data.get("password")

        if name is not None:
            user.name = name
        if employee_id is not None:
            user.employee_id = employee_id
        if profile_picture is not None:
            user.profile_picture = profile_picture

        if password:
            user.set_password(password)
            user.save()
        else:
            user.save()

        return success_response(
            message="Profile updated successfully",
            data={
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "name": getattr(user, "name", "") or "",
                "employee_id": getattr(user, "employee_id", "") or "",
                "profile_picture": getattr(user, "profile_picture", "") or "",
                "can_crud_tasks": getattr(user, "can_crud_tasks", False),
            },
            status_code=status.HTTP_200_OK,
        )


# Data listing


class AdminListView(APIView):

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):

        search = request.GET.get("search")
        sort_by = request.GET.get("sort_by", "-id")
        if sort_by.lstrip("-") not in [
            "id",
            "username",
            "email",
            "phone_number",
            "created_at",
        ]:
            sort_by = "-id"

        queryset = User.objects.filter(role=UserRole.ADMIN.value).order_by(sort_by)

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
            )

        paginator = CustomPagination()

        paginated_queryset = paginator.paginate_queryset(queryset, request)

        data = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
                "role": user.role,
            }
            for user in paginated_queryset
        ]

        return paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Admins fetched successfully",
                "data": data,
            }
        )


class AdminDetailView(APIView):

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get_admin(self, admin_id):
        try:
            return User.objects.get(id=admin_id, role=UserRole.ADMIN.value)
        except User.DoesNotExist:
            return None

    def get(self, request, admin_id):
        admin = self.get_admin(admin_id)
        if not admin:
            return error_response(
                message="Admin not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        return success_response(
            message="Admin fetched successfully",
            data={
                "id": admin.id,
                "username": admin.username,
                "email": admin.email,
                "phone_number": admin.phone_number,
                "role": admin.role,
            },
            status_code=status.HTTP_200_OK,
        )

    def put(self, request, admin_id):
        admin = self.get_admin(admin_id)
        if not admin:
            return error_response(
                message="Admin not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateAdminSerializer(
            admin,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if not serializer.is_valid():
            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        updated_admin = serializer.save()

        return success_response(
            message="Admin updated successfully",
            data={
                "id": updated_admin.id,
                "username": updated_admin.username,
                "email": updated_admin.email,
                "phone_number": updated_admin.phone_number,
                "role": updated_admin.role,
            },
            status_code=status.HTTP_200_OK,
        )

    def delete(self, request, admin_id):
        admin = self.get_admin(admin_id)
        if not admin:
            return error_response(
                message="Admin not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        admin.delete()

        return success_response(
            message="Admin deleted successfully",
            status_code=status.HTTP_200_OK,
        )


class TeamMemberListForSuperAdminView(APIView):

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):

        search = request.GET.get("search")
        sort_by = request.GET.get("sort_by", "-id")
        if sort_by.lstrip("-") not in [
            "id",
            "username",
            "email",
            "phone_number",
            "created_at",
        ]:
            sort_by = "-id"

        queryset = (
            User.objects.filter(role=UserRole.TEAM_MEMBER.value)
            .select_related("created_by")
            .order_by(sort_by)
        )

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
            )

        paginator = CustomPagination()

        paginated_queryset = paginator.paginate_queryset(queryset, request)

        data = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
                "role": user.role,
                "created_by": (user.created_by.username if user.created_by else None),
                "can_crud_tasks": getattr(user, "can_crud_tasks", False),
            }
            for user in paginated_queryset
        ]

        return paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Team members fetched successfully",
                "data": data,
            }
        )


class TeamMemberListForAdminView(APIView):

    permission_classes = [IsAuthenticated, CanCrudTasks]

    def get(self, request):

        search = request.GET.get("search")
        sort_by = request.GET.get("sort_by", "-id")
        if sort_by.lstrip("-") not in [
            "id",
            "username",
            "email",
            "phone_number",
            "created_at",
        ]:
            sort_by = "-id"

        if request.user.role == UserRole.ADMIN.value:
            queryset = User.objects.filter(
                role=UserRole.TEAM_MEMBER.value, created_by=request.user
            ).order_by(sort_by)
        else:
            leader = request.user.created_by
            if leader:
                queryset = User.objects.filter(
                    role=UserRole.TEAM_MEMBER.value, created_by=leader
                ).order_by(sort_by)
            else:
                queryset = User.objects.filter(id=request.user.id).order_by(sort_by)

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
            )

        paginator = CustomPagination()

        paginated_queryset = paginator.paginate_queryset(queryset, request)

        data = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
                "role": user.role,
                "name": getattr(user, "name", "") or "",
                "employee_id": getattr(user, "employee_id", "") or "",
                "profile_picture": getattr(user, "profile_picture", "") or "",
            }
            for user in paginated_queryset
        ]

        return paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Your team members fetched successfully",
                "data": data,
            }
        )


class TeamMemberDetailView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def get_member(self, member_id, request):
        try:
            return User.objects.get(
                id=member_id,
                role=UserRole.TEAM_MEMBER.value,
                created_by=request.user,
            )
        except User.DoesNotExist:
            return None

    def get(self, request, member_id):
        member = self.get_member(member_id, request)
        if not member:
            return error_response(
                message="Team member not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        return success_response(
            message="Team member fetched successfully",
            data={
                "id": member.id,
                "username": member.username,
                "email": member.email,
                "phone_number": member.phone_number,
                "role": member.role,
            },
            status_code=status.HTTP_200_OK,
        )

    def put(self, request, member_id):
        member = self.get_member(member_id, request)
        if not member:
            return error_response(
                message="Team member not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateTeamMemberSerializer(
            member,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if not serializer.is_valid():
            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        updated_member = serializer.save()

        return success_response(
            message="Team member updated successfully",
            data={
                "id": updated_member.id,
                "username": updated_member.username,
                "email": updated_member.email,
                "phone_number": updated_member.phone_number,
                "role": updated_member.role,
            },
            status_code=status.HTTP_200_OK,
        )

    def delete(self, request, member_id):
        member = self.get_member(member_id, request)
        if not member:
            return error_response(
                message="Team member not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        member.delete()

        return success_response(
            message="Team member deleted successfully",
            status_code=status.HTTP_200_OK,
        )


# task creation


class CreateTaskView(APIView):

    permission_classes = [IsAuthenticated, CanCrudTasks]

    def post(self, request):

        serializer = TaskCreateSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():

            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        task = serializer.save()

        return success_response(
            message="Task created successfully",
            data=TaskListSerializer(task).data,
            status_code=status.HTTP_201_CREATED,
        )


class AdminTaskListView(APIView):

    permission_classes = [IsAuthenticated, CanCrudTasks]

    def get(self, request):

        cache_key = make_cache_key(f"user:{request.user.id}:tasks", request)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        search = request.GET.get("search")

        if request.user.role == UserRole.ADMIN.value:
            queryset = Task.objects.filter(
                Q(assigned_by=request.user) | Q(assigned_by__created_by=request.user)
            )
        else:
            queryset = Task.objects.filter(
                Q(assigned_by=request.user) | Q(assignees=request.user)
            )

        queryset = queryset.prefetch_related("assignees").select_related(
            "assigned_by", "assigned_by__created_by"
        ).distinct()

        # Filters
        completed_param = request.GET.get("completed")
        if completed_param == "true":
            queryset = queryset.filter(status=TaskStatus.COMPLETED)
        else:
            one_week_ago = timezone.now() - timedelta(days=7)
            queryset = queryset.exclude(
                status=TaskStatus.COMPLETED, updated_at__lt=one_week_ago
            )

        date_val = request.GET.get("date")
        if date_val:
            queryset = queryset.filter(
                Q(due_date=date_val) | Q(revised_due_date=date_val)
            )

        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if start_date and end_date:
            queryset = queryset.filter(
                Q(due_date__range=(start_date, end_date))
                | Q(revised_due_date__range=(start_date, end_date))
            )

        project_val = request.GET.get("project")
        if project_val:
            queryset = queryset.filter(project_name__icontains=project_val)

        employee_val = request.GET.get("employee_name")
        if employee_val:
            queryset = queryset.filter(
                Q(assignees__username__icontains=employee_val)
                | Q(assignees__name__icontains=employee_val)
            ).distinct()

        if search:
            queryset = queryset.filter(
                Q(task_name__icontains=search)
                | Q(project_name__icontains=search)
                | Q(status__icontains=search)
            )

        sort_by = request.GET.get("sort_by", "-id")
        if sort_by.lstrip("-") not in [
            "id",
            "task_name",
            "project_name",
            "due_date",
            "priority",
            "status",
            "created_at",
        ]:
            sort_by = "-id"
        queryset = queryset.order_by(sort_by)

        paginator = CustomPagination()

        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = TaskListSerializer(paginated_queryset, many=True)

        response_obj = paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Tasks fetched successfully",
                "data": serializer.data,
            }
        )
        cache.set(cache_key, response_obj.data, timeout=86400)
        return response_obj


class AdminTaskDetailView(APIView):

    permission_classes = [IsAuthenticated, CanCrudTasks]

    def patch(self, request, task_id):

        try:
            if request.user.role == UserRole.ADMIN.value:
                task = Task.objects.get(
                    Q(id=task_id)
                    & (
                        Q(assigned_by=request.user)
                        | Q(assigned_by__created_by=request.user)
                    )
                )
            else:
                task = Task.objects.get(id=task_id, assigned_by=request.user)
        except Task.DoesNotExist:

            return error_response(
                message="Task not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        serializer = TaskCreateSerializer(
            task,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if not serializer.is_valid():

            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        updated_task = serializer.save()

        return success_response(
            message="Task updated successfully",
            data=TaskListSerializer(updated_task).data,
            status_code=status.HTTP_200_OK,
        )

    def delete(self, request, task_id):

        try:
            if request.user.role == UserRole.ADMIN.value:
                task = Task.objects.get(
                    Q(id=task_id)
                    & (
                        Q(assigned_by=request.user)
                        | Q(assigned_by__created_by=request.user)
                    )
                )
            else:
                task = Task.objects.get(id=task_id, assigned_by=request.user)
        except Task.DoesNotExist:

            return error_response(
                message="Task not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        task.delete()

        return success_response(
            message="Task deleted successfully",
            data={},
            status_code=status.HTTP_200_OK,
        )


class TeamMemberTaskListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        cache_key = make_cache_key(f"user:{request.user.id}:tasks", request)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        search = request.GET.get("search")
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")

        queryset = (
            Task.objects.filter(assignees=request.user)
            .prefetch_related("assignees")
            .select_related("assigned_by", "assigned_by__created_by")
            .distinct()
        )

        if start_date and end_date:
            queryset = queryset.filter(
                Q(due_date__range=(start_date, end_date))
                | Q(revised_due_date__range=(start_date, end_date))
            )

        if search:
            queryset = queryset.filter(
                Q(task_name__icontains=search)
                | Q(project_name__icontains=search)
                | Q(status__icontains=search)
            )

        sort_by = request.GET.get("sort_by", "-id")
        if sort_by.lstrip("-") not in [
            "id",
            "task_name",
            "project_name",
            "due_date",
            "priority",
            "status",
            "created_at",
        ]:
            sort_by = "-id"
        queryset = queryset.order_by(sort_by)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        serializer = TaskListSerializer(paginated_queryset, many=True)

        response_obj = paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Your tasks fetched successfully",
                "data": serializer.data,
            }
        )
        cache.set(cache_key, response_obj.data, timeout=86400)
        return response_obj


class UpdateTaskStatusView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, task_id):

        if request.data.get("status") == "COMPLETED":
            return error_response(
                message="Only admins can mark tasks as completed.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            task = Task.objects.get(id=task_id, assignees=request.user)
        except Task.DoesNotExist:

            return error_response(
                message="Task not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        serializer = TaskStatusUpdateSerializer(task, data=request.data, partial=True)

        if not serializer.is_valid():

            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save()

        return success_response(
            message="Task status updated successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )


class SuperAdminTaskProgressView(APIView):

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):

        cache_key = make_cache_key("superadmin:task_progress", request)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        search = request.GET.get("search")
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        status_filter = request.GET.get("status")
        assignee = request.GET.get("assignee")
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")

        queryset = Task.objects.prefetch_related("assignees").select_related(
            "assigned_by", "assigned_by__created_by"
        )

        # Dropdown Filters
        if task_name:
            queryset = queryset.filter(task_name=task_name)
        if project_name:
            queryset = queryset.filter(project_name=project_name)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if assignee:
            queryset = queryset.filter(assignees__username=assignee).distinct()
        if start_date and end_date:
            queryset = queryset.filter(
                Q(due_date__range=(start_date, end_date))
                | Q(revised_due_date__range=(start_date, end_date))
            )

        if search:
            queryset = queryset.filter(
                Q(task_name__icontains=search)
                | Q(project_name__icontains=search)
                | Q(status__icontains=search)
            )

        sort_by = request.GET.get("sort_by", "-id")
        if sort_by.lstrip("-") not in [
            "id",
            "task_name",
            "project_name",
            "due_date",
            "priority",
            "status",
            "created_at",
        ]:
            sort_by = "-id"
        queryset = queryset.order_by(sort_by)

        paginator = CustomPagination()

        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = TaskListSerializer(paginated_queryset, many=True)

        response_obj = paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Task progress fetched successfully",
                "data": serializer.data,
            }
        )
        cache.set(cache_key, response_obj.data, timeout=86400)
        return response_obj


class CreateTimesheetView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = TimesheetCreateSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():
            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        timesheet = serializer.save()

        return success_response(
            message="Timesheet created successfully",
            data=TimesheetListSerializer(timesheet).data,
            status_code=status.HTTP_201_CREATED,
        )


class UpdateTimesheetView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, timesheet_id):

        try:
            timesheet = Timesheet.objects.get(id=timesheet_id, team_member=request.user)
        except Timesheet.DoesNotExist:

            return error_response(
                message="Timesheet not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        if timezone.now() - timesheet.created_at > timedelta(hours=24):
            return error_response(
                message="Timesheet cannot be updated after 24 hours of creation.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TimesheetUpdateSerializer(
            timesheet,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():

            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save()

        return success_response(
            message="Timesheet updated successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    def put(self, request, timesheet_id):
        return self.patch(request, timesheet_id)


class AdminTimesheetListView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):

        cache_key = make_cache_key(f"user:{request.user.id}:timesheets", request)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        date_filter = request.GET.get("date")

        queryset = (
            Timesheet.objects.filter(team_member__created_by=request.user)
            .select_related(
                "task",
                "team_member",
                "task__assigned_by",
                "task__assigned_by__created_by",
            )
            .prefetch_related("task__assignees")
        )

        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if start_date and end_date:
            queryset = queryset.filter(start_time__range=(start_date, end_date))
        elif date_filter:
            queryset = queryset.filter(start_time__date=date_filter)

        # Filters: task name, project name, employee name
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        employee_name = request.GET.get("employee_name")

        if task_name:
            queryset = queryset.filter(task__task_name__icontains=task_name)
        if project_name:
            queryset = queryset.filter(task__project_name__icontains=project_name)
        if employee_name:
            queryset = queryset.filter(
                Q(team_member__username__icontains=employee_name)
                | Q(team_member__name__icontains=employee_name)
            )

        sort_by = request.GET.get("sort_by", "-id")
        if sort_by.lstrip("-") not in [
            "id",
            "working_hours",
            "start_time",
            "end_time",
            "task__task_name",
            "team_member__username",
            "status",
            "created_at",
        ]:
            sort_by = "-id"
        queryset = queryset.order_by(sort_by)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = TimesheetListSerializer(
            paginated_queryset,
            many=True,
        )

        response_obj = paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Team timesheets fetched successfully",
                "data": serializer.data,
            }
        )
        cache.set(cache_key, response_obj.data, timeout=86400)
        return response_obj


class SuperAdminTimesheetListView(APIView):

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):

        cache_key = make_cache_key("superadmin:timesheets", request)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        date_filter = request.GET.get("date")

        queryset = Timesheet.objects.select_related(
            "task",
            "team_member",
            "task__assigned_by",
            "task__assigned_by__created_by",
        ).prefetch_related("task__assignees")

        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if start_date and end_date:
            queryset = queryset.filter(start_time__range=(start_date, end_date))
        elif date_filter:
            queryset = queryset.filter(start_time__date=date_filter)

        # Filters: task name, project name, employee name
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        employee_name = request.GET.get("employee_name")

        if task_name:
            queryset = queryset.filter(task__task_name__icontains=task_name)
        if project_name:
            queryset = queryset.filter(task__project_name__icontains=project_name)
        if employee_name:
            queryset = queryset.filter(
                Q(team_member__username__icontains=employee_name)
                | Q(team_member__name__icontains=employee_name)
            )

        sort_by = request.GET.get("sort_by", "-id")
        if sort_by.lstrip("-") not in [
            "id",
            "working_hours",
            "start_time",
            "end_time",
            "task__task_name",
            "team_member__username",
            "status",
            "created_at",
        ]:
            sort_by = "-id"
        queryset = queryset.order_by(sort_by)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = TimesheetListSerializer(
            paginated_queryset,
            many=True,
        )

        response_obj = paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "All timesheets fetched successfully",
                "data": serializer.data,
            }
        )
        cache.set(cache_key, response_obj.data, timeout=86400)
        return response_obj


class TeamMemberTimesheetListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        cache_key = make_cache_key(f"user:{request.user.id}:timesheets", request)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        date_filter = request.GET.get("date")

        if getattr(request.user, "can_crud_tasks", False):
            queryset = Timesheet.objects.filter(
                Q(team_member=request.user) | Q(task__assigned_by=request.user)
            )
        else:
            queryset = Timesheet.objects.filter(team_member=request.user)

        queryset = queryset.select_related(
            "task",
            "team_member",
            "task__assigned_by",
            "task__assigned_by__created_by",
        ).prefetch_related("task__assignees")

        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if start_date and end_date:
            queryset = queryset.filter(start_time__range=(start_date, end_date))
        elif date_filter:
            queryset = queryset.filter(start_time__date=date_filter)

        # New filters: task name, project name, employee name
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        employee_name = request.GET.get("employee_name")
        if task_name:
            queryset = queryset.filter(task__task_name__icontains=task_name)
        if project_name:
            queryset = queryset.filter(task__project_name__icontains=project_name)
        if employee_name:
            queryset = queryset.filter(
                Q(team_member__username__icontains=employee_name)
                | Q(team_member__name__icontains=employee_name)
            )

        sort_by = request.GET.get("sort_by", "-id")
        if sort_by.lstrip("-") not in [
            "id",
            "working_hours",
            "start_time",
            "end_time",
            "task__task_name",
            "team_member__username",
            "status",
            "created_at",
        ]:
            sort_by = "-id"
        queryset = queryset.order_by(sort_by)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = TimesheetListSerializer(
            paginated_queryset,
            many=True,
        )

        response_obj = paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Your timesheets fetched successfully",
                "data": serializer.data,
            }
        )
        cache.set(cache_key, response_obj.data, timeout=86400)
        return response_obj


# ─── Task Full Detail (comments + subtasks) ───


class TaskFullDetailView(APIView):
    """GET full task detail with comments and subtasks."""

    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        try:
            task = (
                Task.objects.prefetch_related("assignees", "comments__user", "subtasks")
                .select_related("assigned_by", "assigned_by__created_by")
                .get(id=task_id)
            )
        except Task.DoesNotExist:
            return error_response(
                message="Task not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        is_admin_owner = (
            request.user.role == UserRole.ADMIN.value
            and (
                task.assigned_by == request.user
                or (
                    task.assigned_by
                    and task.assigned_by.created_by == request.user
                )
            )
        )
        is_assignee = task.assignees.filter(id=request.user.id).exists()
        is_super = request.user.role == UserRole.SUPER_ADMIN.value

        if not (is_admin_owner or is_assignee or is_super):
            return error_response(
                message="You don't have permission to view this task",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = TaskDetailSerializer(task)
        return success_response(
            message="Task detail fetched",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )


# ─── Task Comments ───


class TaskCommentListCreateView(APIView):
    """GET list of comments, POST new comment."""

    permission_classes = [IsAuthenticated]

    def _get_task_or_403(self, request, task_id):
        try:
            task = Task.objects.select_related("assigned_by", "assigned_by__created_by").get(id=task_id)
        except Task.DoesNotExist:
            return None, error_response(
                message="Task not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        is_admin_owner = (
            request.user.role == UserRole.ADMIN.value
            and (
                task.assigned_by == request.user
                or (
                    task.assigned_by
                    and task.assigned_by.created_by == request.user
                )
            )
        )
        is_assignee = task.assignees.filter(id=request.user.id).exists()
        is_super = request.user.role == UserRole.SUPER_ADMIN.value

        if not (is_admin_owner or is_assignee or is_super):
            return None, error_response(
                message="Access denied",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return task, None

    def get(self, request, task_id):
        task, err = self._get_task_or_403(request, task_id)
        if err:
            return err

        # Load from cache first
        cache_key = f"task:{task_id}:comments"
        try:
            cached_data = cache.get(cache_key)
        except Exception:
            cached_data = None

        if cached_data is not None:
            return success_response(
                message="Comments fetched (cached)",
                data=cached_data,
                status_code=status.HTTP_200_OK,
            )

        # Limit to last 200 comments to prevent huge payload fetches
        comments = task.comments.select_related("user").order_by("created_at")[:200]
        serializer = TaskCommentSerializer(comments, many=True)

        try:
            cache.set(cache_key, serializer.data, timeout=86400)
        except Exception:
            pass

        return success_response(
            message="Comments fetched",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    def post(self, request, task_id):
        task, err = self._get_task_or_403(request, task_id)
        if err:
            return err

        content = request.data.get("content", "").strip()
        if not content:
            return error_response(
                message="Comment content is required",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        comment = TaskComment.objects.create(
            task=task,
            user=request.user,
            content=content,
        )

        # Invalidate comments list cache for this task
        try:
            cache.delete(f"task:{task_id}:comments")
        except Exception:
            pass

        # ── Create notifications for relevant users ──
        sender = request.user
        
        # Combine assignee queries into one single values_list read
        assignee_data = list(task.assignees.values_list("id", "created_by_id"))
        assignee_ids = {item[0] for item in assignee_data}
        assignee_managers = {item[1] for item in assignee_data if item[1]}
        
        admin_id = task.assigned_by_id

        # Collect all recipient IDs (assignees + creator + managers), excluding the commenter
        recipient_ids = assignee_ids | {admin_id}
        if task.assigned_by and task.assigned_by.created_by_id:
            recipient_ids.add(task.assigned_by.created_by_id)

        recipient_ids.update(assignee_managers)

        recipient_ids.discard(sender.id)

        sender_display = getattr(sender, "name", "") or sender.username
        notif_message = f'{sender_display} commented on task "{task.task_name}"'

        notifications = [
            Notification(
                recipient_id=rid,
                sender=sender,
                task=task,
                comment=comment,
                message=notif_message,
            )
            for rid in recipient_ids
        ]
        if notifications:
            one_day_ago = timezone.now() - timedelta(days=1)
            Notification.objects.filter(
                recipient_id__in=recipient_ids,
                comment__isnull=False,
                created_at__lt=one_day_ago,
            ).delete()
            Notification.objects.bulk_create(notifications)

        serializer = TaskCommentSerializer(comment)
        return success_response(
            message="Comment added",
            data=serializer.data,
            status_code=status.HTTP_201_CREATED,
        )


class TaskCommentUpdateDeleteView(APIView):
    """PUT/PATCH edit a comment, DELETE delete a comment. Restricted to comment owner only."""

    permission_classes = [IsAuthenticated]

    def _get_comment_and_check_owner(self, request, task_id, comment_id):
        try:
            comment = TaskComment.objects.select_related("task").get(id=comment_id, task_id=task_id)
        except TaskComment.DoesNotExist:
            return None, error_response(
                message="Comment not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        if comment.user != request.user:
            return None, error_response(
                message="You do not have permission to edit or delete this comment",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        # Restrict edits and deletes to a 15-minute window from creation time
        now = timezone.now()
        if now - comment.created_at > datetime.timedelta(minutes=15):
            return None, error_response(
                message="Comments can only be edited or deleted within 15 minutes of posting",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        return comment, None

    def put(self, request, task_id, comment_id):
        comment, err = self._get_comment_and_check_owner(request, task_id, comment_id)
        if err:
            return err

        content = request.data.get("content", "").strip()
        if not content:
            return error_response(
                message="Comment content is required",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        comment.content = content
        comment.save()

        # Invalidate task comments cache
        try:
            cache.delete(f"task:{task_id}:comments")
        except Exception:
            pass

        serializer = TaskCommentSerializer(comment)
        return success_response(
            message="Comment updated",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    def delete(self, request, task_id, comment_id):
        comment, err = self._get_comment_and_check_owner(request, task_id, comment_id)
        if err:
            return err

        comment.delete()

        # Invalidate task comments cache
        try:
            cache.delete(f"task:{task_id}:comments")
        except Exception:
            pass

        return success_response(
            message="Comment deleted",
            data={},
            status_code=status.HTTP_200_OK,
        )


# ─── SubTasks ───


class SubTaskListCreateView(APIView):
    """GET list subtasks, POST create subtask (admin or permitted member)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return error_response(
                message="Task not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        # Limit to 100 subtasks to prevent large payload fetches
        subtasks = task.subtasks.all()[:100]
        serializer = SubTaskSerializer(subtasks, many=True)
        return success_response(
            message="Subtasks fetched",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    def post(self, request, task_id):
        is_admin = request.user.role == UserRole.ADMIN.value
        is_permitted_member = (
            request.user.role == UserRole.TEAM_MEMBER.value
            and request.user.can_crud_tasks
        )
        if not (is_admin or is_permitted_member):
            return error_response(
                message="Only admins or permitted team members can create subtasks",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            if request.user.role == UserRole.ADMIN.value:
                task = Task.objects.get(
                    Q(id=task_id)
                    & (
                        Q(assigned_by=request.user)
                        | Q(assigned_by__created_by=request.user)
                    )
                )
            else:
                task = Task.objects.get(id=task_id, assigned_by=request.user)
        except Task.DoesNotExist:
            return error_response(
                message="Task not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        title = request.data.get("title", "").strip()
        if not title:
            return error_response(
                message="Subtask title is required",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        subtask = SubTask.objects.create(task=task, title=title)
        serializer = SubTaskSerializer(subtask)
        return success_response(
            message="Subtask created",
            data=serializer.data,
            status_code=status.HTTP_201_CREATED,
        )


class SubTaskUpdateDeleteView(APIView):
    """PATCH toggle completion, DELETE remove subtask."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, task_id, subtask_id):
        try:
            subtask = SubTask.objects.get(id=subtask_id, task_id=task_id)
        except SubTask.DoesNotExist:
            return error_response(
                message="Subtask not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        if "is_completed" in request.data:
            subtask.is_completed = request.data["is_completed"]
        else:
            subtask.is_completed = not subtask.is_completed
        subtask.save()

        serializer = SubTaskSerializer(subtask)
        return success_response(
            message="Subtask updated",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    def delete(self, request, task_id, subtask_id):
        is_admin = request.user.role == UserRole.ADMIN.value
        is_permitted_member = (
            request.user.role == UserRole.TEAM_MEMBER.value
            and request.user.can_crud_tasks
        )
        if not (is_admin or is_permitted_member):
            return error_response(
                message="Only admins or permitted team members can delete subtasks",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            subtask = SubTask.objects.get(id=subtask_id, task_id=task_id)
            task = subtask.task
            if request.user.role == UserRole.ADMIN.value:
                if (
                    task.assigned_by != request.user
                    and task.assigned_by.created_by != request.user
                ):
                    raise SubTask.DoesNotExist
            else:
                if task.assigned_by != request.user:
                    raise SubTask.DoesNotExist
        except SubTask.DoesNotExist:
            return error_response(
                message="Subtask not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        subtask.delete()
        return success_response(
            message="Subtask deleted",
            data=None,
            status_code=status.HTTP_200_OK,
        )


# ─── Notifications ───


class NotificationListView(APIView):
    """GET all notifications for the authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        one_day_ago = timezone.now() - datetime.timedelta(days=1)
        queryset = Notification.objects.filter(
            recipient=request.user, created_at__gte=one_day_ago
        ).select_related("sender", "task", "comment")

        unread = request.GET.get("unread")
        if unread and unread.lower() in ("true", "1"):
            queryset = queryset.filter(is_read=False)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        serializer = NotificationSerializer(paginated_queryset, many=True)

        return paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Notifications fetched successfully",
                "data": serializer.data,
            }
        )


class NotificationUnreadCountView(APIView):
    """GET unread notification count for the authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        one_day_ago = timezone.now() - datetime.timedelta(days=1)
        count = Notification.objects.filter(
            recipient=request.user, is_read=False, created_at__gte=one_day_ago
        ).count()

        return success_response(
            message="Unread count fetched",
            data={"count": count},
            status_code=status.HTTP_200_OK,
        )


class NotificationMarkReadView(APIView):
    """PATCH mark a single notification as read."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        try:
            notification = Notification.objects.get(
                id=notification_id, recipient=request.user
            )
        except Notification.DoesNotExist:
            return error_response(
                message="Notification not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])

        return success_response(
            message="Notification marked as read",
            data=NotificationSerializer(notification).data,
            status_code=status.HTTP_200_OK,
        )


class NotificationMarkAllReadView(APIView):
    """PATCH mark all notifications as read for the authenticated user."""

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        one_day_ago = timezone.now() - datetime.timedelta(days=1)
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False, created_at__gte=one_day_ago
        ).update(is_read=True)

        return success_response(
            message=f"{updated} notifications marked as read",
            data={"updated": updated},
            status_code=status.HTTP_200_OK,
        )


# ─── Announcements ───


class CreateAnnouncementView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in [UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value]:
            return error_response(
                message="Only Super Admins and Admins can create announcements",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = AnnouncementCreateSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        announcement = serializer.save()

        # Send notifications to recipients in the target audience
        sender = request.user
        recipients = []
        if announcement.audience == "ADMINS_ONLY":
            recipients = User.objects.filter(role=UserRole.ADMIN.value).exclude(
                id=sender.id
            )
        elif announcement.audience == "ALL":
            recipients = User.objects.filter(
                role__in=[UserRole.ADMIN.value, UserRole.TEAM_MEMBER.value]
            ).exclude(id=sender.id)
        elif announcement.audience == "MY_TEAM":
            recipients = User.objects.filter(
                role=UserRole.TEAM_MEMBER.value, created_by=sender
            )

        notifications = [
            Notification(
                recipient=recipient,
                sender=sender,
                message=f"New Announcement: {announcement.title}",
                task=None,
                announcement=announcement,
            )
            for recipient in recipients
        ]
        if notifications:
            one_day_ago = timezone.now() - timedelta(days=1)
            Notification.objects.filter(
                recipient__in=recipients,
                announcement__isnull=False,
                created_at__lt=one_day_ago,
            ).delete()
            Notification.objects.bulk_create(notifications)

        return success_response(
            message="Announcement created successfully",
            data=AnnouncementListSerializer(announcement).data,
            status_code=status.HTTP_201_CREATED,
        )


class AnnouncementListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Redirect super admins to super admin list endpoint logic
        if user.role == UserRole.SUPER_ADMIN.value:
            queryset = Announcement.objects.all().select_related("sender")
        elif user.role == UserRole.ADMIN.value:
            # Admins see Super Admin announcements sent to ADMINS_ONLY or ALL, and their own announcements
            queryset = Announcement.objects.filter(
                Q(
                    sender__role=UserRole.SUPER_ADMIN.value,
                    audience__in=[
                        AnnouncementAudience.ADMINS_ONLY.value,
                        AnnouncementAudience.ALL.value,
                    ],
                )
                | Q(sender=user)
            ).select_related("sender")
        else:
            # Team Members see Super Admin announcements sent to ALL, and their own admin's announcements (sender=created_by, audience=MY_TEAM)
            admin_user = user.created_by
            if admin_user:
                queryset = Announcement.objects.filter(
                    Q(
                        sender__role=UserRole.SUPER_ADMIN.value,
                        audience=AnnouncementAudience.ALL.value,
                    )
                    | Q(sender=admin_user, audience=AnnouncementAudience.MY_TEAM.value)
                ).select_related("sender")
            else:
                queryset = Announcement.objects.filter(
                    sender__role=UserRole.SUPER_ADMIN.value,
                    audience=AnnouncementAudience.ALL.value,
                ).select_related("sender")

        # Optional search by title
        title_query = request.GET.get("title")
        if title_query:
            queryset = queryset.filter(title__icontains=title_query)

        sort_by = request.GET.get("sort_by", "-created_at")
        if sort_by.lstrip("-") not in ["created_at", "title", "id"]:
            sort_by = "-created_at"
        queryset = queryset.order_by(sort_by)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        serializer = AnnouncementListSerializer(paginated_queryset, many=True)

        return paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Announcements fetched successfully",
                "data": serializer.data,
            }
        )


class AnnouncementDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, announcement_id):
        try:
            announcement = Announcement.objects.get(id=announcement_id)
        except Announcement.DoesNotExist:
            return error_response(
                message="Announcement not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        # Check if the user is the sender
        if announcement.sender != request.user:
            return error_response(
                message="Only the member who sent the message can edit/delete it",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = AnnouncementUpdateSerializer(announcement, data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save()
        return success_response(
            message="Announcement updated successfully",
            data=AnnouncementListSerializer(announcement).data,
            status_code=status.HTTP_200_OK,
        )

    def delete(self, request, announcement_id):
        try:
            announcement = Announcement.objects.get(id=announcement_id)
        except Announcement.DoesNotExist:
            return error_response(
                message="Announcement not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        # Check if the user is the sender
        if announcement.sender != request.user:
            return error_response(
                message="Only the member who sent the message can edit/delete it",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        announcement.delete()
        return success_response(
            message="Announcement deleted successfully",
            data=None,
            status_code=status.HTTP_200_OK,
        )


class SuperAdminAnnouncementListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        queryset = Announcement.objects.all().select_related("sender")

        # Optional search by title
        title_query = request.GET.get("title")
        if title_query:
            queryset = queryset.filter(title__icontains=title_query)

        sort_by = request.GET.get("sort_by", "-created_at")
        if sort_by.lstrip("-") not in ["created_at", "title", "id"]:
            sort_by = "-created_at"
        queryset = queryset.order_by(sort_by)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        serializer = AnnouncementListSerializer(paginated_queryset, many=True)

        return paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "All announcements fetched successfully",
                "data": serializer.data,
            }
        )


class SuperAdminTeamMemberDetailView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get_member(self, member_id):
        try:
            return User.objects.get(id=member_id, role=UserRole.TEAM_MEMBER.value)
        except User.DoesNotExist:
            return None

    def get(self, request, member_id):
        member = self.get_member(member_id)
        if not member:
            return error_response(
                message="Team member not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return success_response(
            message="Team member fetched successfully",
            data={
                "id": member.id,
                "username": member.username,
                "email": member.email,
                "phone_number": member.phone_number,
                "role": member.role,
                "can_crud_tasks": member.can_crud_tasks,
            },
            status_code=status.HTTP_200_OK,
        )

    def put(self, request, member_id):
        member = self.get_member(member_id)
        if not member:
            return error_response(
                message="Team member not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        username = request.data.get("user_name")
        email = request.data.get("email")
        phone_number = request.data.get("phone_number")
        can_crud_tasks = request.data.get("can_crud_tasks")

        if username is not None:
            member.username = username
        if email is not None:
            member.email = email
        if phone_number is not None:
            phone_str = str(phone_number)
            if len(phone_str) != 10:
                return error_response(
                    message="Phone number must be exactly 10 digits.",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            if phone_str[0] not in "6789":
                return error_response(
                    message="Indian phone number must start with 6, 7, 8, or 9.",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            member.phone_number = phone_number
        if can_crud_tasks is not None:
            member.can_crud_tasks = bool(can_crud_tasks)

        member.save()

        return success_response(
            message="Team member updated successfully",
            data={
                "id": member.id,
                "username": member.username,
                "email": member.email,
                "phone_number": member.phone_number,
                "role": member.role,
                "can_crud_tasks": member.can_crud_tasks,
            },
            status_code=status.HTTP_200_OK,
        )

    def delete(self, request, member_id):
        member = self.get_member(member_id)
        if not member:
            return error_response(
                message="Team member not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        member.delete()
        return success_response(
            message="Team member deleted successfully",
            status_code=status.HTTP_200_OK,
        )


class TaskFilterOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == UserRole.SUPER_ADMIN.value:
            tasks_qs = Task.objects.all()
        elif user.role == UserRole.ADMIN.value:
            tasks_qs = Task.objects.filter(
                Q(assigned_by=user) | Q(assigned_by__created_by=user)
            )
        else:
            tasks_qs = Task.objects.filter(assignees=user)

        projects = list(
            tasks_qs.values_list("project_name", flat=True)
            .distinct()
            .order_by("project_name")
        )
        task_names = list(
            tasks_qs.values_list("task_name", flat=True)
            .distinct()
            .order_by("task_name")
        )

        assignee_ids = tasks_qs.values_list("assignees", flat=True).distinct()
        assignees = list(
            User.objects.filter(id__in=assignee_ids)
            .values_list("username", flat=True)
            .order_by("username")
        )

        statuses = list(
            tasks_qs.values_list("status", flat=True).distinct().order_by("status")
        )

        return success_response(
            message="Filter options fetched successfully",
            data={
                "projects": [p for p in projects if p],
                "task_names": [t for t in task_names if t],
                "assignees": [a for a in assignees if a],
                "statuses": [s for s in statuses if s],
            },
            status_code=status.HTTP_200_OK,
        )


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user
        role = user.role

        if role == UserRole.SUPER_ADMIN.value:
            cache_key = "superadmin:dashboard:stats"
        else:
            cache_key = f"user:{user.id}:dashboard:stats"

        cached_data = cache.get(cache_key)
        if cached_data:
            return success_response(
                message="Dashboard statistics fetched successfully (cached)",
                data=cached_data,
                status_code=status.HTTP_200_OK,
            )

        if role == UserRole.SUPER_ADMIN.value:
            tasks_qs = Task.objects.all()
            timesheets_qs = Timesheet.objects.all()
        elif role == UserRole.ADMIN.value:
            tasks_qs = Task.objects.filter(
                Q(assigned_by=user) | Q(assigned_by__created_by=user)
            )
            timesheets_qs = Timesheet.objects.filter(team_member__created_by=user)
        else:  # TEAM_MEMBER
            tasks_qs = Task.objects.filter(assignees=user)
            if getattr(user, "can_crud_tasks", False):
                timesheets_qs = Timesheet.objects.filter(
                    Q(team_member=user) | Q(task__assigned_by=user)
                )
            else:
                timesheets_qs = Timesheet.objects.filter(team_member=user)

        total_count = tasks_qs.count()
        completed_count = tasks_qs.filter(status=TaskStatus.COMPLETED).count()
        active_count = total_count - completed_count

        today = timezone.localdate()
        overdue_count = (
            tasks_qs.exclude(status__in=[TaskStatus.COMPLETED, TaskStatus.HOLD])
            .filter(due_date__lt=today)
            .count()
        )

        progress = (
            round((completed_count / total_count) * 100) if total_count > 0 else 0
        )

        status_counts = tasks_qs.values("status").annotate(count=Count("id"))
        status_map = {
            "PENDING": 0,
            "IN_PROGRESS": 0,
            "IN_REVIEW": 0,
            "HOLD": 0,
            "COMPLETED": 0,
        }
        for item in status_counts:
            stat = item["status"]
            if stat in status_map:
                status_map[stat] = item["count"]
            else:
                status_map[stat] = item["count"]

        active_tasks = tasks_qs.exclude(status=TaskStatus.COMPLETED)
        workload_query = active_tasks.values("assignees__username").annotate(
            count=Count("id")
        )
        unassigned_count = active_tasks.filter(assignees__isnull=True).count()

        workload_map = {}
        for item in workload_query:
            username = item["assignees__username"]
            if username:
                workload_map[username] = item["count"]
        if unassigned_count > 0:
            workload_map["Unassigned"] = unassigned_count

        workload_data = [
            {"name": name, "tasks": count} for name, count in workload_map.items()
        ]
        workload_data.sort(key=lambda x: x["tasks"], reverse=True)

        active_list = list(
            active_tasks.prefetch_related("assignees").select_related(
                "assigned_by", "assigned_by__created_by"
            )[:100]
        )
        p_weight = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

        def get_urgency(task):
            due = task.due_date
            if not due:
                return 1
            if due < today:
                return 3
            elif due == today:
                return 2
            else:
                return 1

        active_list.sort(
            key=lambda t: (
                -get_urgency(t),
                -p_weight.get(t.priority, 0),
                t.due_date or datetime.date.max,
            )
        )
        top_critical = active_list[:5]

        top_critical_serialized = []
        for t in top_critical:
            top_critical_serialized.append(
                {
                    "id": t.id,
                    "task_name": t.task_name,
                    "project_name": t.project_name,
                    "priority": t.priority,
                    "status": t.status,
                    "due_date": str(t.due_date) if t.due_date else None,
                    "revised_due_date": (
                        str(t.revised_due_date) if t.revised_due_date else None
                    ),
                    "assignees": [
                        {
                            "id": u.id,
                            "username": u.username,
                            "name": getattr(u, "name", "") or "",
                        }
                        for u in t.assignees.all()
                    ],
                }
            )

        recent_tasks = (
            tasks_qs.order_by("-created_at")
            .prefetch_related("assignees")
            .select_related("assigned_by", "assigned_by__created_by")[:10]
        )
        recent_timesheets = timesheets_qs.order_by("-created_at").select_related(
            "task", "team_member"
        )[:10]

        activities = []
        for t in recent_tasks:
            activities.append(
                {
                    "id": f"task-{t.id}",
                    "type": "TASK",
                    "date": t.created_at.isoformat(),
                    "title": f"Task Created: {t.task_name}",
                    "desc": f"{', '.join(['@' + u.username for u in t.assignees.all()]) if t.assignees.exists() else 'Someone'} was assigned to {t.project_name}",
                    "user": t.assigned_by.username if t.assigned_by else "Admin",
                }
            )

        for ts in recent_timesheets:
            activities.append(
                {
                    "id": f"ts-{ts.id}",
                    "type": "TIMESHEET",
                    "date": ts.created_at.isoformat(),
                    "title": f"Time Logged: {ts.task.task_name if ts.task else 'A task'}",
                    "desc": f"{ts.team_member.username if ts.team_member else 'A member'} logged time.",
                    "user": ts.team_member.username if ts.team_member else "Unknown",
                }
            )

        activities.sort(key=lambda x: x["date"], reverse=True)
        recent_activities = activities[:8]

        response_data = {
            "metrics": {
                "totalActive": active_count,
                "overdue": overdue_count,
                "completed": completed_count,
                "progress": progress,
            },
            "statusData": [
                item
                for item in [
                    {
                        "name": "To-do",
                        "value": status_map.get("PENDING", 0),
                        "originalStatus": "PENDING",
                    },
                    {
                        "name": "In Progress",
                        "value": status_map.get("IN_PROGRESS", 0),
                        "originalStatus": "IN_PROGRESS",
                    },
                    {
                        "name": "In Review",
                        "value": status_map.get("IN_REVIEW", 0),
                        "originalStatus": "IN_REVIEW",
                    },
                    {
                        "name": "Hold",
                        "value": status_map.get("HOLD", 0),
                        "originalStatus": "HOLD",
                    },
                    {
                        "name": "Completed",
                        "value": status_map.get("COMPLETED", 0),
                        "originalStatus": "COMPLETED",
                    },
                ]
                if item["value"] > 0
            ],
            "workloadData": workload_data,
            "topCriticalTasks": top_critical_serialized,
            "recentActivity": recent_activities,
        }

        cache.set(cache_key, response_data, timeout=86400)

        return success_response(
            message="Dashboard statistics fetched successfully",
            data=response_data,
            status_code=status.HTTP_200_OK,
        )


# ─── Employee Scorecard APIs ───


def calculate_monthly_metrics(employee, year, month):
    start_date = datetime.date(year, month, 1)
    if month == 12:
        end_date = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        end_date = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)



    # Total tasks due in this month (excluding HOLD tasks)
    tasks = Task.objects.filter(
        assignees=employee, due_date__range=(start_date, end_date)
    ).exclude(status=TaskStatus.HOLD)

    total_tasks = tasks.count()
    if total_tasks > 0:
        completed_on_time = (
            tasks.filter(status=TaskStatus.COMPLETED)
            .filter(
                Q(updated_at__isnull=True)
                | (
                    Q(revised_due_date__isnull=False)
                    & Q(updated_at__date__lte=F("revised_due_date"))
                )
                | (
                    Q(revised_due_date__isnull=True)
                    & Q(updated_at__date__lte=F("due_date"))
                )
            )
            .count()
        )
        task_completion_rate = completed_on_time / total_tasks * 100.0
    else:
        task_completion_rate = 100.0

    # Timesheet hours
    timesheets = Timesheet.objects.filter(
        team_member=employee, start_time__year=year, start_time__month=month
    )
    working_hours = timesheets.aggregate(total=Sum("working_hours"))["total"] or 0.0

    import calendar
    cal = calendar.Calendar()
    total_working_days = sum(
        1 for day in cal.itermonthdays2(year, month)
        if day[0] != 0 and day[1] < 5
    )

    distinct_days_logged = timesheets.values("start_time__date").distinct().count()
    timesheet_compliance = min(100.0, (distinct_days_logged / total_working_days) * 100.0) if total_working_days > 0 else 100.0

    return (
        round(task_completion_rate, 2),
        round(float(working_hours), 2),
        round(timesheet_compliance, 2),
    )


def get_bulk_monthly_metrics(team_members, year, month):
    start_date = datetime.date(year, month, 1)
    if month == 12:
        end_date = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        end_date = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)



    # Bulk count tasks for all team members in a single query (excluding HOLD tasks)
    task_counts = (
        Task.objects.filter(
            assignees__in=team_members, due_date__range=(start_date, end_date)
        )
        .exclude(status=TaskStatus.HOLD)
        .values("assignees")
        .annotate(
            total=Count("id"),
            completed_on_time=Count(
                "id",
                filter=Q(status=TaskStatus.COMPLETED)
                & (
                    Q(updated_at__isnull=True)
                    | (
                        Q(revised_due_date__isnull=False)
                        & Q(updated_at__date__lte=F("revised_due_date"))
                    )
                    | (
                        Q(revised_due_date__isnull=True)
                        & Q(updated_at__date__lte=F("due_date"))
                    )
                ),
            ),
        )
    )
    task_metrics_map = {item["assignees"]: item for item in task_counts}

    # Bulk sum working hours for all team members in a single query
    timesheet_hours = (
        Timesheet.objects.filter(
            team_member__in=team_members, start_time__year=year, start_time__month=month
        )
        .values("team_member")
        .annotate(total_hours=Sum("working_hours"))
    )
    timesheet_metrics_map = {
        item["team_member"]: item["total_hours"] for item in timesheet_hours
    }

    # Bulk fetch logged days per employee in this month
    timesheet_days = (
        Timesheet.objects.filter(
            team_member__in=team_members, start_time__year=year, start_time__month=month
        )
        .values("team_member", "start_time__date")
        .distinct()
    )
    logged_days_map = {}
    for item in timesheet_days:
        uid = item["team_member"]
        logged_days_map[uid] = logged_days_map.get(uid, 0) + 1

    import calendar
    cal = calendar.Calendar()
    total_working_days = sum(
        1 for day in cal.itermonthdays2(year, month)
        if day[0] != 0 and day[1] < 5
    )

    metrics = {}
    for tm in team_members:
        task_stats = task_metrics_map.get(tm.id, {"total": 0, "completed_on_time": 0})
        total_t = task_stats["total"]
        cot = task_stats["completed_on_time"]
        tcr = (cot / total_t * 100.0) if total_t > 0 else 100.0
        tcr = round(tcr, 2)

        wh = float(timesheet_metrics_map.get(tm.id, 0.0) or 0.0)
        wh = round(wh, 2)

        distinct_days = logged_days_map.get(tm.id, 0)
        tc = min(100.0, (distinct_days / total_working_days) * 100.0) if total_working_days > 0 else 100.0
        tc = round(tc, 2)

        metrics[tm.id] = (tcr, wh, tc)

    return metrics


class EmployeeScorecardListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month_str = request.query_params.get("month")
        if not month_str:
            month_str = datetime.date.today().strftime("%Y-%m-01")

        try:
            if len(month_str) == 7:  # YYYY-MM
                year = int(month_str[:4])
                month = int(month_str[5:7])
                month_date = datetime.date(year, month, 1)
            else:  # YYYY-MM-DD
                month_date = datetime.datetime.strptime(month_str, "%Y-%m-%d").date()
                month_date = month_date.replace(day=1)
                year = month_date.year
                month = month_date.month
        except Exception:
            return error_response(
                message="Invalid month format. Use YYYY-MM or YYYY-MM-DD",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        role = request.user.role

        if role == UserRole.SUPER_ADMIN.value:
            scorecards = EmployeeScorecard.objects.filter(
                month=month_date
            ).select_related("employee")
            team_members = User.objects.filter(role=UserRole.TEAM_MEMBER.value)
            scorecard_map = {sc.employee.id: sc for sc in scorecards}

            missing_members = [tm for tm in team_members if tm.id not in scorecard_map]
            bulk_metrics = (
                get_bulk_monthly_metrics(missing_members, year, month)
                if missing_members
                else {}
            )

            data = []
            for tm in team_members:
                if tm.id in scorecard_map:
                    data.append(EmployeeScorecardSerializer(scorecard_map[tm.id]).data)
                else:
                    tcr, wh, tc = bulk_metrics.get(tm.id, (100.0, 0.0, 100.0))
                    data.append(
                        {
                            "id": None,
                            "employee": {
                                "id": tm.id,
                                "username": tm.username,
                                "name": getattr(tm, "name", "") or tm.username,
                                "profile_picture": getattr(tm, "profile_picture", "")
                                or "",
                            },
                            "month": month_date.strftime("%Y-%m-%d"),
                            "task_completion_rate": tcr,
                            "working_hours": wh,
                            "timesheet_compliance": tc,
                            "quality_score": 0.0,
                            "attendance_score": 0.0,
                            "learning_rate_score": 0.0,
                            "overall_score": round(
                                (tcr * 0.25) + ((tc / 2.0) * 0.25), 2
                            ),
                            "status": "NOT_CREATED",
                            "admin_comments": "",
                            "superadmin_comments": "",
                        }
                    )

            company_avg = (
                scorecards.aggregate(Avg("overall_score"))["overall_score__avg"] or 0.0
            )

            return success_response(
                data={
                    "scorecards": data,
                    "company_average": round(company_avg, 2),
                },
                message="Scorecards fetched successfully",
            )

        elif role == UserRole.ADMIN.value:
            team_members = User.objects.filter(
                role=UserRole.TEAM_MEMBER.value, created_by=request.user
            )
            scorecards = EmployeeScorecard.objects.filter(
                month=month_date, employee__in=team_members
            ).select_related("employee")
            scorecard_map = {sc.employee.id: sc for sc in scorecards}

            missing_members = [tm for tm in team_members if tm.id not in scorecard_map]
            bulk_metrics = (
                get_bulk_monthly_metrics(missing_members, year, month)
                if missing_members
                else {}
            )

            data = []
            for tm in team_members:
                if tm.id in scorecard_map:
                    data.append(EmployeeScorecardSerializer(scorecard_map[tm.id]).data)
                else:
                    tcr, wh, tc = bulk_metrics.get(tm.id, (100.0, 0.0, 100.0))
                    data.append(
                        {
                            "id": None,
                            "employee": {
                                "id": tm.id,
                                "username": tm.username,
                                "name": getattr(tm, "name", "") or tm.username,
                                "profile_picture": getattr(tm, "profile_picture", "")
                                or "",
                            },
                            "month": month_date.strftime("%Y-%m-%d"),
                            "task_completion_rate": tcr,
                            "working_hours": wh,
                            "timesheet_compliance": tc,
                            "quality_score": 0.0,
                            "attendance_score": 0.0,
                            "learning_rate_score": 0.0,
                            "overall_score": round(
                                (tcr * 0.25) + ((tc / 2.0) * 0.25), 2
                            ),
                            "status": "NOT_CREATED",
                            "admin_comments": "",
                            "superadmin_comments": "",
                        }
                    )

            avg_score = (
                scorecards.aggregate(Avg("overall_score"))["overall_score__avg"] or 0.0
            )

            return success_response(
                data={
                    "scorecards": data,
                    "team_average": round(avg_score, 2),
                },
                message="Team scorecards fetched successfully",
            )

        elif role == UserRole.TEAM_MEMBER.value:
            try:
                scorecard = EmployeeScorecard.objects.get(
                    employee=request.user,
                    month=month_date,
                    status=ScorecardStatus.PUBLISHED.value,
                )
                serialized_data = EmployeeScorecardSerializer(scorecard).data
            except EmployeeScorecard.DoesNotExist:
                serialized_data = None

            history = EmployeeScorecard.objects.filter(
                employee=request.user, status=ScorecardStatus.PUBLISHED.value
            ).order_by("month")[:6]
            history_data = [EmployeeScorecardSerializer(sc).data for sc in history]

            leader = request.user.created_by
            team_avg = 0.0
            if leader:
                team_scorecards = EmployeeScorecard.objects.filter(
                    month=month_date,
                    employee__created_by=leader,
                    status=ScorecardStatus.PUBLISHED.value,
                )
                team_avg = (
                    team_scorecards.aggregate(Avg("overall_score"))[
                        "overall_score__avg"
                    ]
                    or 0.0
                )

            return success_response(
                data={
                    "scorecard": serialized_data,
                    "history": history_data,
                    "team_average": round(team_avg, 2),
                },
                message="My scorecard fetched successfully",
            )


class EmployeeScorecardSaveView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        employee_id = request.data.get("employee")
        month_str = request.data.get("month")

        if not employee_id or not month_str:
            return error_response(
                message="Employee and month are required",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            employee = User.objects.get(
                id=employee_id, role=UserRole.TEAM_MEMBER.value, created_by=request.user
            )
        except User.DoesNotExist:
            return error_response(
                message="Invalid employee id",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        try:
            month_date = datetime.datetime.strptime(month_str, "%Y-%m-%d").date()
            month_date = month_date.replace(day=1)
            year = month_date.year
            month = month_date.month
        except Exception:
            return error_response(
                message="Invalid month format. Use YYYY-MM-DD",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        tcr, wh, tc = calculate_monthly_metrics(employee, year, month)

        scorecard, created = EmployeeScorecard.objects.get_or_create(
            employee=employee,
            month=month_date,
            defaults={
                "task_completion_rate": tcr,
                "working_hours": wh,
                "timesheet_compliance": tc,
            },
        )

        if not created:
            scorecard.task_completion_rate = tcr
            scorecard.working_hours = wh
            scorecard.timesheet_compliance = tc

        if scorecard.status in [
            ScorecardStatus.SUBMITTED.value,
            ScorecardStatus.APPROVED.value,
            ScorecardStatus.PUBLISHED.value,
        ]:
            return error_response(
                message=f"Cannot edit scorecard in {scorecard.status} status.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        serializer = EmployeeScorecardCreateUpdateSerializer(
            scorecard, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return error_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        saved_scorecard = serializer.save()
        return success_response(
            data=EmployeeScorecardSerializer(saved_scorecard).data,
            message="Scorecard saved successfully",
            status_code=status.HTTP_200_OK,
        )


class EmployeeScorecardReviewView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        try:
            scorecard = EmployeeScorecard.objects.get(pk=pk)
        except EmployeeScorecard.DoesNotExist:
            return error_response(
                message="Scorecard not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get("status")
        if new_status not in [
            ScorecardStatus.APPROVED.value,
            ScorecardStatus.REJECTED.value,
            ScorecardStatus.PUBLISHED.value,
        ]:
            return error_response(
                message="Invalid status for review",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        superadmin_comments = request.data.get("superadmin_comments", "")

        scorecard.status = new_status
        if superadmin_comments:
            scorecard.superadmin_comments = superadmin_comments

        scorecard.save()

        return success_response(
            data=EmployeeScorecardSerializer(scorecard).data,
            message=f"Scorecard status updated to {new_status}",
        )


class EmployeeScorecardDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = request.user.role
        month_str = request.query_params.get("month")
        if not month_str:
            month_str = datetime.date.today().strftime("%Y-%m-01")

        try:
            if len(month_str) == 7:
                month_date = datetime.datetime.strptime(
                    month_str + "-01", "%Y-%m-%d"
                ).date()
            else:
                month_date = (
                    datetime.datetime.strptime(month_str, "%Y-%m-%d")
                    .date()
                    .replace(day=1)
                )
        except Exception:
            return error_response(
                message="Invalid month format",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if role == UserRole.SUPER_ADMIN.value:
            scorecards = EmployeeScorecard.objects.filter(month=month_date)
            company_avg = (
                scorecards.aggregate(Avg("overall_score"))["overall_score__avg"] or 0.0
            )
            pending_count = scorecards.filter(
                status=ScorecardStatus.SUBMITTED.value
            ).count()
            risk_count = scorecards.filter(
                Q(overall_score__lt=70.0) | Q(task_completion_rate__lt=60.0)
            ).count()

            # Optimize the admin loop using bulk queries
            stats = EmployeeScorecard.objects.filter(month=month_date).values(
                'employee__created_by'
            ).annotate(
                avg_score=Avg('overall_score'),
                risk_count=Count('id', filter=Q(overall_score__lt=70.0) | Q(task_completion_rate__lt=60.0)),
                member_count=Count('employee', distinct=True)
            )

            # Map admin ID to scorecard aggregates
            stats_map = {
                item['employee__created_by']: item 
                for item in stats 
                if item['employee__created_by'] is not None
            }

            # Map active team member counts for all admins
            admin_member_counts = User.objects.filter(
                role=UserRole.TEAM_MEMBER.value,
                created_by__isnull=False
            ).values('created_by').annotate(count=Count('id'))
            member_count_map = {item['created_by']: item['count'] for item in admin_member_counts}

            admins = User.objects.filter(role=UserRole.ADMIN.value)
            team_comparison = []
            for admin in admins:
                admin_stats = stats_map.get(admin.id, {})
                team_comparison.append(
                    {
                        "admin_id": admin.id,
                        "admin_name": getattr(admin, "name", "") or admin.username,
                        "member_count": member_count_map.get(admin.id, 0),
                        "team_average": round(admin_stats.get('avg_score') or 0.0, 2),
                        "risk_alerts": admin_stats.get('risk_count') or 0,
                    }
                )

            return success_response(
                data={
                    "company_average": round(company_avg, 2),
                    "pending_reviews": pending_count,
                    "risk_alerts": risk_count,
                    "team_comparison": team_comparison,
                }
            )

        elif role == UserRole.ADMIN.value:
            team_members = User.objects.filter(
                role=UserRole.TEAM_MEMBER.value, created_by=request.user
            )
            scorecards = EmployeeScorecard.objects.filter(
                month=month_date, employee__in=team_members
            )

            team_avg = (
                scorecards.aggregate(Avg("overall_score"))["overall_score__avg"] or 0.0
            )
            pending_count = scorecards.filter(
                status=ScorecardStatus.DRAFT.value
            ).count()
            risk_count = scorecards.filter(
                Q(overall_score__lt=70.0) | Q(task_completion_rate__lt=60.0)
            ).count()

            # Optimize the historical trend loop using 1 bulk query
            past_dates = []
            for i in range(5, -1, -1):
                d = month_date - datetime.timedelta(days=i * 30)
                past_dates.append(d.replace(day=1))

            past_stats = EmployeeScorecard.objects.filter(
                month__in=past_dates, employee__in=team_members
            ).values('month').annotate(avg_score=Avg('overall_score'))

            past_stats_map = {item['month']: item['avg_score'] for item in past_stats}

            historical_averages = []
            for past_date in past_dates:
                avg_val = past_stats_map.get(past_date) or 0.0
                historical_averages.append(
                    {
                        "month": past_date.strftime("%Y-%m"),
                        "average": round(avg_val, 2),
                    }
                )

            return success_response(
                data={
                    "team_average": round(team_avg, 2),
                    "pending_submissions": pending_count,
                    "risk_alerts": risk_count,
                    "historical_trend": historical_averages,
                }
            )
        else:
            return error_response(
                message="Unauthorized",
                status_code=status.HTTP_403_FORBIDDEN,
            )


class EmployeeScorecardDrilldownView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, employee_id):
        role = request.user.role

        if role == UserRole.ADMIN.value:
            try:
                employee = User.objects.get(
                    id=employee_id,
                    role=UserRole.TEAM_MEMBER.value,
                    created_by=request.user,
                )
            except User.DoesNotExist:
                return error_response(
                    message="Unauthorized or employee not found",
                    status_code=status.HTTP_403_FORBIDDEN,
                )
        elif role == UserRole.SUPER_ADMIN.value:
            try:
                employee = User.objects.get(
                    id=employee_id, role=UserRole.TEAM_MEMBER.value
                )
            except User.DoesNotExist:
                return error_response(
                    message="Employee not found",
                    status_code=status.HTTP_404_NOT_FOUND,
                )
        else:
            return error_response(
                message="Unauthorized",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        scorecards = EmployeeScorecard.objects.filter(employee=employee).select_related("employee").order_by(
            "month"
        )
        scorecards_data = EmployeeScorecardSerializer(scorecards, many=True).data

        # Lifetime metrics
        lifetime_total = Task.objects.filter(assignees=employee).exclude(status=TaskStatus.HOLD).count()
        lifetime_completed = Task.objects.filter(
            assignees=employee, status=TaskStatus.COMPLETED
        ).count()

        # Monthly metrics (if month param provided)
        month_str = request.GET.get("month")
        start_date = None
        end_date = None
        if month_str:
            try:
                # Handle YYYY-MM or YYYY-MM-DD
                if len(month_str) == 7:
                    year = int(month_str[:4])
                    month = int(month_str[5:7])
                else:
                    month_date = datetime.datetime.strptime(month_str, "%Y-%m-%d").date()
                    year = month_date.year
                    month = month_date.month
                
                start_date = datetime.date(year, month, 1)
                if month == 12:
                    end_date = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
                else:
                    end_date = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)
            except Exception:
                pass

        if start_date and end_date:
            monthly_total = Task.objects.filter(
                assignees=employee, due_date__range=(start_date, end_date)
            ).exclude(status=TaskStatus.HOLD).count()
            monthly_completed = Task.objects.filter(
                assignees=employee,
                status=TaskStatus.COMPLETED,
                due_date__range=(start_date, end_date)
            ).count()
        else:
            monthly_total = lifetime_total
            monthly_completed = lifetime_completed

        return success_response(
            data={
                "employee": {
                    "id": employee.id,
                    "username": employee.username,
                    "name": getattr(employee, "name", "") or employee.username,
                    "profile_picture": getattr(employee, "profile_picture", "") or "",
                },
                "scorecards": scorecards_data,
                "task_metrics": {
                    "total_tasks": monthly_total,
                    "completed_tasks": monthly_completed,
                    "completion_rate": round(
                        (
                            (monthly_completed / monthly_total * 100.0)
                            if monthly_total > 0
                            else 100.0
                        ),
                        2,
                    ),
                },
                "lifetime_metrics": {
                    "total_tasks": lifetime_total,
                    "completed_tasks": lifetime_completed,
                    "completion_rate": round(
                        (
                            (lifetime_completed / lifetime_total * 100.0)
                            if lifetime_total > 0
                            else 100.0
                        ),
                        2,
                    ),
                },
            }
        )


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query_str = request.GET.get("q", "").strip()
        if not query_str:
            return success_response(
                message="Query is empty",
                data={"results": []}
            )

        results = []

        # 1. Define Role-Scoped Querysets for Security
        if request.user.role == UserRole.SUPER_ADMIN.value:
            tasks_qs = Task.objects.all()
            announcements_qs = Announcement.objects.all()
        elif request.user.role == UserRole.ADMIN.value:
            tasks_qs = Task.objects.filter(
                Q(assigned_by=request.user) | Q(assigned_by__created_by=request.user)
            )
            announcements_qs = Announcement.objects.filter(
                Q(
                    sender__role=UserRole.SUPER_ADMIN.value,
                    audience__in=[
                        AnnouncementAudience.ADMINS_ONLY.value,
                        AnnouncementAudience.ALL.value,
                    ],
                )
                | Q(sender=request.user)
            )
        else:
            tasks_qs = Task.objects.filter(
                Q(assigned_by=request.user) | Q(assignees=request.user)
            )
            admin_user = request.user.created_by
            if admin_user:
                announcements_qs = Announcement.objects.filter(
                    Q(
                        sender__role=UserRole.SUPER_ADMIN.value,
                        audience=AnnouncementAudience.ALL.value,
                    )
                    | Q(sender=admin_user, audience=AnnouncementAudience.MY_TEAM.value)
                )
            else:
                announcements_qs = Announcement.objects.filter(
                    sender__role=UserRole.SUPER_ADMIN.value,
                    audience=AnnouncementAudience.ALL.value,
                )

        comments_qs = TaskComment.objects.filter(task__in=tasks_qs)

        # 2. Attempt Elasticsearch Query
        es_query = {
            "query": {
                "multi_match": {
                    "query": query_str,
                    "fields": [
                        "task_name^3",
                        "project_name^2",
                        "description",
                        "title^3",
                        "message",
                        "content"
                    ],
                    "fuzziness": "AUTO"
                }
            },
            "size": 30
        }

        es_results = search_index(["tasks", "comments", "announcements"], es_query)

        if es_results and es_results.get("hits", {}).get("hits"):
            # Extract IDs from hits to perform localized security filter checks
            hit_task_ids = []
            hit_comment_ids = []
            hit_announcement_ids = []
            for hit in es_results["hits"]["hits"]:
                source = hit["_source"]
                doc_type = source.get("type")
                doc_id = source.get("id")
                if doc_type == "task" and doc_id:
                    hit_task_ids.append(doc_id)
                elif doc_type == "comment" and doc_id:
                    hit_comment_ids.append(doc_id)
                elif doc_type == "announcement" and doc_id:
                    hit_announcement_ids.append(doc_id)

            # Query database to check permissions on ONLY the returned Elasticsearch matches (max 30)
            allowed_task_ids = set(tasks_qs.filter(id__in=hit_task_ids).values_list('id', flat=True)) if hit_task_ids else set()
            allowed_comment_ids = set(comments_qs.filter(id__in=hit_comment_ids).values_list('id', flat=True)) if hit_comment_ids else set()
            allowed_announcement_ids = set(announcements_qs.filter(id__in=hit_announcement_ids).values_list('id', flat=True)) if hit_announcement_ids else set()

            # Parse and Filter Elasticsearch Hits
            for hit in es_results["hits"]["hits"]:
                source = hit["_source"]
                doc_type = source.get("type", "unknown")
                doc_id = source.get("id")

                # Apply security boundaries to search results
                if doc_type == "task" and doc_id not in allowed_task_ids:
                    continue
                if doc_type == "comment" and doc_id not in allowed_comment_ids:
                    continue
                if doc_type == "announcement" and doc_id not in allowed_announcement_ids:
                    continue

                results.append({
                    "id": doc_id,
                    "type": doc_type,
                    "title": source.get("task_name") or source.get("title") or f"{doc_type} #{doc_id}",
                    "subtitle": source.get("project_name") or source.get("sender") or source.get("username") or "",
                    "description": source.get("description") or source.get("message") or source.get("content") or "",
                    "score": hit["_score"]
                })
        else:
            # 3. Secure Database Fallback
            # Find matching Tasks
            tasks = tasks_qs.filter(
                Q(task_name__icontains=query_str) |
                Q(project_name__icontains=query_str) |
                Q(description__icontains=query_str)
            ).distinct()[:10]
            for t in tasks:
                results.append({
                    "id": t.id,
                    "type": "task",
                    "title": t.task_name,
                    "subtitle": t.project_name,
                    "description": t.description[:150] if t.description else "",
                    "score": 1.0
                })

            # Find matching Announcements (select_related sender to prevent N+1 queries)
            announcements = announcements_qs.select_related("sender").filter(
                Q(title__icontains=query_str) |
                Q(message__icontains=query_str)
            ).distinct()[:10]
            for a in announcements:
                results.append({
                    "id": a.id,
                    "type": "announcement",
                    "title": a.title,
                    "subtitle": a.sender.username if a.sender else "",
                    "description": a.message[:150] if a.message else "",
                    "score": 1.0
                })

            # Find matching Comments (select_related task and user to prevent N+1 queries)
            comments = comments_qs.select_related("task", "user").filter(
                Q(content__icontains=query_str)
            ).distinct()[:10]
            for c in comments:
                results.append({
                    "id": c.id,
                    "type": "comment",
                    "title": f"Comment on {c.task.task_name}" if c.task else "Comment",
                    "subtitle": c.user.username if c.user else "",
                    "description": c.content[:150] if c.content else "",
                    "score": 1.0
                })

        return success_response(
            message="Search results retrieved successfully",
            data={"results": results}
        )

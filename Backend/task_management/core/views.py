import os
from dotenv import load_dotenv
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    LoginSerializer,
    CreateAdminSerializer,
    CreateTeamLeaderSerializer,
    UpdateTeamMemberSerializer,
    TaskCreateSerializer,
    TaskListSerializer,
    TaskStatusUpdateSerializer,
    TimesheetCreateSerializer,
    TimesheetUpdateSerializer,
    TimesheetListSerializer,
)
from .permissions import IsAdmin, IsSuperAdmin
from .roles import UserRole
from .response import success_response, error_response
from .pagination import CustomPagination
from django.db.models import Q
from .models import Task, Timesheet

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
            },
            status_code=status.HTTP_200_OK,
        )


# Data listing


class AdminListView(APIView):

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):

        search = request.GET.get("search")

        queryset = User.objects.filter(role=UserRole.ADMIN.value).order_by("-id")

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


class TeamMemberListForSuperAdminView(APIView):

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):

        search = request.GET.get("search")

        queryset = (
            User.objects.filter(role=UserRole.TEAM_MEMBER.value)
            .select_related("created_by")
            .order_by("-id")
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

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):

        search = request.GET.get("search")

        queryset = User.objects.filter(
            role=UserRole.TEAM_MEMBER.value, created_by=request.user
        ).order_by("-id")

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

    permission_classes = [IsAuthenticated, IsAdmin]

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

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):

        search = request.GET.get("search")

        queryset = Task.objects.filter(assigned_by=request.user).select_related(
            "assignee", "assigned_by"
        )

        if search:
            queryset = queryset.filter(
                Q(task_name__icontains=search)
                | Q(project_name__icontains=search)
                | Q(status__icontains=search)
            )

        paginator = CustomPagination()

        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = TaskListSerializer(paginated_queryset, many=True)

        return paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Tasks fetched successfully",
                "data": serializer.data,
            }
        )


class AdminTaskDetailView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, task_id):

        try:
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

        search = request.GET.get("search")

        queryset = Task.objects.filter(assignee=request.user).select_related(
            "assignee", "assigned_by"
        )

        if search:
            queryset = queryset.filter(
                Q(task_name__icontains=search)
                | Q(project_name__icontains=search)
                | Q(status__icontains=search)
            )

        serializer = TaskListSerializer(queryset, many=True)

        return success_response(
            message="Your tasks fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )


class UpdateTaskStatusView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, task_id):

        if request.data.get("status") == "COMPLETED":
            return error_response(
                message="Only admins can mark tasks as completed.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            task = Task.objects.get(id=task_id, assignee=request.user)
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

        search = request.GET.get("search")

        queryset = Task.objects.select_related("assignee", "assigned_by")

        if search:
            queryset = queryset.filter(
                Q(task_name__icontains=search)
                | Q(project_name__icontains=search)
                | Q(status__icontains=search)
            )

        serializer = TaskListSerializer(queryset, many=True)

        return success_response(
            message="Task progress fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )


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


class AdminTimesheetListView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        date_filter = request.GET.get("date")
        
        queryset = Timesheet.objects.filter(
            team_member__created_by=request.user
        ).select_related(
            "task",
            "team_member",
            "task__assigned_by",
        )
        
        if date_filter:
            queryset = queryset.filter(start_time__date=date_filter)

        # New filters: task name and project name
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        if task_name:
            queryset = queryset.filter(task__task_name__icontains=task_name)
        if project_name:
            queryset = queryset.filter(task__project_name__icontains=project_name)

        serializer = TimesheetListSerializer(
            queryset,
            many=True,
        )

        return success_response(
            message="Team timesheets fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )


class SuperAdminTimesheetListView(APIView):

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        date_filter = request.GET.get("date")

        queryset = Timesheet.objects.select_related(
            "task",
            "team_member",
            "task__assigned_by",
        )
        
        if date_filter:
            queryset = queryset.filter(start_time__date=date_filter)

        # New filters: task name and project name
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        if task_name:
            queryset = queryset.filter(task__task_name__icontains=task_name)
        if project_name:
            queryset = queryset.filter(task__project_name__icontains=project_name)

        serializer = TimesheetListSerializer(
            queryset,
            many=True,
        )

        return success_response(
            message="All timesheets fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )


class TeamMemberTimesheetListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_filter = request.GET.get("date")

        queryset = Timesheet.objects.filter(team_member=request.user).select_related(
            "task",
            "team_member",
            "task__assigned_by",
        )

        if date_filter:
            queryset = queryset.filter(start_time__date=date_filter)

        # New filters: task name and project name
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        if task_name:
            queryset = queryset.filter(task__task_name__icontains=task_name)
        if project_name:
            queryset = queryset.filter(task__project_name__icontains=project_name)

        serializer = TimesheetListSerializer(
            queryset,
            many=True,
        )

        return success_response(
            message="Your timesheets fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

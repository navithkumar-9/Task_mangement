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
)
from .permissions import IsAdmin, IsSuperAdmin
from .roles import UserRole
from .response import success_response, error_response
from .pagination import CustomPagination
from django.db.models import Q
from .models import Task, Timesheet, TaskComment, SubTask, Notification

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

        queryset = Task.objects.filter(assigned_by=request.user).prefetch_related(
            "assignees"
        ).select_related("assigned_by")

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

        queryset = Task.objects.filter(assignees=request.user).prefetch_related(
            "assignees"
        ).select_related("assigned_by")

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

        search = request.GET.get("search")

        queryset = Task.objects.prefetch_related("assignees").select_related("assigned_by")

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

        from django.utils import timezone
        from datetime import timedelta
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
        date_filter = request.GET.get("date")
        
        queryset = Timesheet.objects.filter(
            team_member__created_by=request.user
        ).select_related(
            "task",
            "team_member",
            "task__assigned_by",
        )
        
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if start_date and end_date:
            queryset = queryset.filter(start_time__range=(start_date, end_date))
        elif date_filter:
            queryset = queryset.filter(start_time__date=date_filter)

        # Filters: task name and project name
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        if task_name:
            queryset = queryset.filter(task__task_name__icontains=task_name)
        if project_name:
            queryset = queryset.filter(task__project_name__icontains=project_name)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = TimesheetListSerializer(
            paginated_queryset,
            many=True,
        )

        return paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Team timesheets fetched successfully",
                "data": serializer.data,
            }
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
        
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if start_date and end_date:
            queryset = queryset.filter(start_time__range=(start_date, end_date))
        elif date_filter:
            queryset = queryset.filter(start_time__date=date_filter)

        # New filters: task name and project name
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        if task_name:
            queryset = queryset.filter(task__task_name__icontains=task_name)
        if project_name:
            queryset = queryset.filter(task__project_name__icontains=project_name)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = TimesheetListSerializer(
            paginated_queryset,
            many=True,
        )

        return paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "All timesheets fetched successfully",
                "data": serializer.data,
            }
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

        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if start_date and end_date:
            queryset = queryset.filter(start_time__range=(start_date, end_date))
        elif date_filter:
            queryset = queryset.filter(start_time__date=date_filter)

        # New filters: task name and project name
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        if task_name:
            queryset = queryset.filter(task__task_name__icontains=task_name)
        if project_name:
            queryset = queryset.filter(task__project_name__icontains=project_name)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = TimesheetListSerializer(
            paginated_queryset,
            many=True,
        )

        return paginator.get_paginated_response(
            {
                "isV1": True,
                "success": True,
                "message": "Your timesheets fetched successfully",
                "data": serializer.data,
            }
        )


# ─── Task Full Detail (comments + subtasks) ───

class TaskFullDetailView(APIView):
    """GET full task detail with comments and subtasks."""
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return error_response(
                message="Task not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        is_admin_owner = (request.user.role == UserRole.ADMIN.value and task.assigned_by == request.user)
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
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return None, error_response(
                message="Task not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        is_admin_owner = (request.user.role == UserRole.ADMIN.value and task.assigned_by == request.user)
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

        comments = task.comments.all()
        serializer = TaskCommentSerializer(comments, many=True)
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

        # ── Create notifications for relevant users ──
        sender = request.user
        assignee_ids = set(task.assignees.values_list("id", flat=True))
        admin_id = task.assigned_by_id

        # Collect all recipient IDs (assignees + admin creator), excluding the commenter
        recipient_ids = assignee_ids | {admin_id}
        recipient_ids.discard(sender.id)

        sender_display = getattr(sender, "name", "") or sender.username
        notif_message = f"{sender_display} commented on task \"{task.task_name}\""

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
            Notification.objects.bulk_create(notifications)

        serializer = TaskCommentSerializer(comment)
        return success_response(
            message="Comment added",
            data=serializer.data,
            status_code=status.HTTP_201_CREATED,
        )


# ─── SubTasks ───

class SubTaskListCreateView(APIView):
    """GET list subtasks, POST create subtask (admin only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return error_response(
                message="Task not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        subtasks = task.subtasks.all()
        serializer = SubTaskSerializer(subtasks, many=True)
        return success_response(
            message="Subtasks fetched",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    def post(self, request, task_id):
        if request.user.role != UserRole.ADMIN.value:
            return error_response(
                message="Only admins can create subtasks",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
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
        if request.user.role != UserRole.ADMIN.value:
            return error_response(
                message="Only admins can delete subtasks",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            subtask = SubTask.objects.get(id=subtask_id, task_id=task_id)
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
        queryset = Notification.objects.filter(
            recipient=request.user
        ).select_related("sender", "task")

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
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
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

        notification.is_read = True
        notification.save()

        return success_response(
            message="Notification marked as read",
            data=NotificationSerializer(notification).data,
            status_code=status.HTTP_200_OK,
        )


class NotificationMarkAllReadView(APIView):
    """PATCH mark all notifications as read for the authenticated user."""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)

        return success_response(
            message=f"{updated} notifications marked as read",
            data={"updated": updated},
            status_code=status.HTTP_200_OK,
        )

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
    AnnouncementCreateSerializer,
    AnnouncementUpdateSerializer,
    AnnouncementListSerializer,
)
from .permissions import IsAdmin, IsSuperAdmin, CanCrudTasks
from .roles import UserRole
from .response import success_response, error_response
from .pagination import CustomPagination
from django.db.models import Q
from .models import Task, Timesheet, TaskComment, SubTask, Notification, Announcement, AnnouncementAudience, TaskStatus

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

        if request.user.role == UserRole.ADMIN.value:
            queryset = User.objects.filter(
                role=UserRole.TEAM_MEMBER.value, created_by=request.user
            ).order_by("-id")
        else:
            leader = request.user.created_by
            if leader:
                queryset = User.objects.filter(
                    role=UserRole.TEAM_MEMBER.value, created_by=leader
                ).order_by("-id")
            else:
                queryset = User.objects.filter(id=request.user.id).order_by("-id")

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

        search = request.GET.get("search")

        if request.user.role == UserRole.ADMIN.value:
            queryset = Task.objects.filter(
                Q(assigned_by=request.user) | Q(assigned_by__created_by=request.user)
            )
        else:
            queryset = Task.objects.filter(
                Q(assigned_by=request.user) | Q(assignees=request.user)
            )

        queryset = queryset.prefetch_related("assignees").select_related("assigned_by", "assigned_by__created_by")

        # Filters
        completed_param = request.GET.get("completed")
        if completed_param == "true":
            queryset = queryset.filter(status=TaskStatus.COMPLETED)
        else:
            from django.utils import timezone
            from datetime import timedelta
            one_week_ago = timezone.now() - timedelta(days=7)
            queryset = queryset.exclude(status=TaskStatus.COMPLETED, updated_at__lt=one_week_ago)

        date_val = request.GET.get("date")
        if date_val:
            queryset = queryset.filter(Q(due_date=date_val) | Q(revised_due_date=date_val))

        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if start_date and end_date:
            queryset = queryset.filter(
                Q(due_date__range=(start_date, end_date)) | Q(revised_due_date__range=(start_date, end_date))
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

    permission_classes = [IsAuthenticated, CanCrudTasks]

    def patch(self, request, task_id):

        try:
            if request.user.role == UserRole.ADMIN.value:
                task = Task.objects.get(
                    Q(id=task_id) & (Q(assigned_by=request.user) | Q(assigned_by__created_by=request.user))
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
                    Q(id=task_id) & (Q(assigned_by=request.user) | Q(assigned_by__created_by=request.user))
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

        search = request.GET.get("search")
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")

        queryset = Task.objects.filter(assignees=request.user).prefetch_related(
            "assignees"
        ).select_related("assigned_by", "assigned_by__created_by")

        if start_date and end_date:
            queryset = queryset.filter(
                Q(due_date__range=(start_date, end_date)) | Q(revised_due_date__range=(start_date, end_date))
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
                "message": "Your tasks fetched successfully",
                "data": serializer.data,
            }
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
        task_name = request.GET.get("task_name")
        project_name = request.GET.get("project_name")
        status_filter = request.GET.get("status")
        assignee = request.GET.get("assignee")
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")

        queryset = Task.objects.prefetch_related("assignees").select_related("assigned_by", "assigned_by__created_by")

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
                Q(due_date__range=(start_date, end_date)) | Q(revised_due_date__range=(start_date, end_date))
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
                "message": "Task progress fetched successfully",
                "data": serializer.data,
            }
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
            "task__assigned_by__created_by",
        ).prefetch_related(
            "task__assignees"
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
            "task__assigned_by__created_by",
        ).prefetch_related(
            "task__assignees"
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
        ).prefetch_related(
            "task__assignees"
        )

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
            task = Task.objects.prefetch_related(
                "assignees",
                "comments__user",
                "subtasks"
            ).select_related(
                "assigned_by",
                "assigned_by__created_by"
            ).get(id=task_id)
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

        comments = task.comments.select_related("user")
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
            from django.utils import timezone
            from datetime import timedelta
            one_day_ago = timezone.now() - timedelta(days=1)
            Notification.objects.filter(recipient_id__in=recipient_ids, created_at__lt=one_day_ago).delete()
            Notification.objects.bulk_create(notifications)

        serializer = TaskCommentSerializer(comment)
        return success_response(
            message="Comment added",
            data=serializer.data,
            status_code=status.HTTP_201_CREATED,
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

        subtasks = task.subtasks.all()
        serializer = SubTaskSerializer(subtasks, many=True)
        return success_response(
            message="Subtasks fetched",
            data=serializer.data,
            status_code=status.HTTP_200_OK,
        )

    def post(self, request, task_id):
        is_admin = request.user.role == UserRole.ADMIN.value
        is_permitted_member = (request.user.role == UserRole.TEAM_MEMBER.value and request.user.can_crud_tasks)
        if not (is_admin or is_permitted_member):
            return error_response(
                message="Only admins or permitted team members can create subtasks",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            if request.user.role == UserRole.ADMIN.value:
                task = Task.objects.get(
                    Q(id=task_id) & (Q(assigned_by=request.user) | Q(assigned_by__created_by=request.user))
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
        is_permitted_member = (request.user.role == UserRole.TEAM_MEMBER.value and request.user.can_crud_tasks)
        if not (is_admin or is_permitted_member):
            return error_response(
                message="Only admins or permitted team members can delete subtasks",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            subtask = SubTask.objects.get(id=subtask_id, task_id=task_id)
            task = subtask.task
            if request.user.role == UserRole.ADMIN.value:
                if task.assigned_by != request.user and task.assigned_by.created_by != request.user:
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


# ─── Announcements ───

class CreateAnnouncementView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in [UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value]:
            return error_response(
                message="Only Super Admins and Admins can create announcements",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = AnnouncementCreateSerializer(data=request.data, context={"request": request})
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
            recipients = User.objects.filter(role=UserRole.ADMIN.value).exclude(id=sender.id)
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
            from django.utils import timezone
            from datetime import timedelta
            one_day_ago = timezone.now() - timedelta(days=1)
            Notification.objects.filter(recipient__in=recipients, created_at__lt=one_day_ago).delete()
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
                Q(sender__role=UserRole.SUPER_ADMIN.value, audience__in=[AnnouncementAudience.ADMINS_ONLY.value, AnnouncementAudience.ALL.value]) |
                Q(sender=user)
            ).select_related("sender")
        else:
            # Team Members see Super Admin announcements sent to ALL, and their own admin's announcements (sender=created_by, audience=MY_TEAM)
            admin_user = user.created_by
            if admin_user:
                queryset = Announcement.objects.filter(
                    Q(sender__role=UserRole.SUPER_ADMIN.value, audience=AnnouncementAudience.ALL.value) |
                    Q(sender=admin_user, audience=AnnouncementAudience.MY_TEAM.value)
                ).select_related("sender")
            else:
                queryset = Announcement.objects.filter(
                    sender__role=UserRole.SUPER_ADMIN.value, audience=AnnouncementAudience.ALL.value
                ).select_related("sender")

        # Optional search by title
        title_query = request.GET.get("title")
        if title_query:
            queryset = queryset.filter(title__icontains=title_query)

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

        projects = list(tasks_qs.values_list("project_name", flat=True).distinct().order_by("project_name"))
        task_names = list(tasks_qs.values_list("task_name", flat=True).distinct().order_by("task_name"))

        assignee_ids = tasks_qs.values_list("assignees", flat=True).distinct()
        assignees = list(User.objects.filter(id__in=assignee_ids).values_list("username", flat=True).order_by("username"))

        statuses = list(tasks_qs.values_list("status", flat=True).distinct().order_by("status"))

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
        from django.db.models import Q, Count
        from django.utils import timezone
        import datetime
        from .roles import UserRole
        from .models import Task, Timesheet, TaskStatus
        
        user = request.user
        role = user.role
        
        if role == UserRole.SUPER_ADMIN.value:
            tasks_qs = Task.objects.all()
            timesheets_qs = Timesheet.objects.all()
        elif role == UserRole.ADMIN.value:
            tasks_qs = Task.objects.filter(
                Q(assigned_by=user) | Q(assigned_by__created_by=user)
            )
            timesheets_qs = Timesheet.objects.filter(
                team_member__created_by=user
            )
        else: # TEAM_MEMBER
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
        overdue_count = tasks_qs.exclude(status=TaskStatus.COMPLETED).filter(due_date__lt=today).count()
        
        progress = round((completed_count / total_count) * 100) if total_count > 0 else 0
        
        status_counts = tasks_qs.values("status").annotate(count=Count("id"))
        status_map = {
            "PENDING": 0,
            "IN_PROGRESS": 0,
            "IN_REVIEW": 0,
            "HOLD": 0,
            "COMPLETED": 0
        }
        for item in status_counts:
            stat = item["status"]
            if stat in status_map:
                status_map[stat] = item["count"]
            else:
                status_map[stat] = item["count"]
        
        active_tasks = tasks_qs.exclude(status=TaskStatus.COMPLETED)
        workload_query = active_tasks.values("assignees__username").annotate(count=Count("id"))
        unassigned_count = active_tasks.filter(assignees__isnull=True).count()
        
        workload_map = {}
        for item in workload_query:
            username = item["assignees__username"]
            if username:
                workload_map[username] = item["count"]
        if unassigned_count > 0:
            workload_map["Unassigned"] = unassigned_count
            
        workload_data = [{"name": name, "tasks": count} for name, count in workload_map.items()]
        workload_data.sort(key=lambda x: x["tasks"], reverse=True)
        
        active_list = list(active_tasks.prefetch_related("assignees").select_related("assigned_by", "assigned_by__created_by")[:100])
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
                t.due_date or datetime.date.max
            )
        )
        top_critical = active_list[:5]
        
        top_critical_serialized = []
        for t in top_critical:
            top_critical_serialized.append({
                "id": t.id,
                "task_name": t.task_name,
                "project_name": t.project_name,
                "priority": t.priority,
                "status": t.status,
                "due_date": str(t.due_date) if t.due_date else None,
                "revised_due_date": str(t.revised_due_date) if t.revised_due_date else None,
                "assignees": [
                    {
                        "id": u.id,
                        "username": u.username,
                        "name": getattr(u, "name", "") or "",
                    }
                    for u in t.assignees.all()
                ]
            })

        recent_tasks = tasks_qs.order_by("-created_at")[:10].prefetch_related("assignees").select_related("assigned_by", "assigned_by__created_by")
        recent_timesheets = timesheets_qs.order_by("-created_at")[:10].select_related("task", "team_member")
        
        activities = []
        for t in recent_tasks:
            activities.append({
                "id": f"task-{t.id}",
                "type": "TASK",
                "date": t.created_at.isoformat(),
                "title": f"Task Created: {t.task_name}",
                "desc": f"{', '.join(['@' + u.username for u in t.assignees.all()]) if t.assignees.exists() else 'Someone'} was assigned to {t.project_name}",
                "user": t.assigned_by.username if t.assigned_by else "Admin"
            })
            
        for ts in recent_timesheets:
            activities.append({
                "id": f"ts-{ts.id}",
                "type": "TIMESHEET",
                "date": ts.created_at.isoformat(),
                "title": f"Time Logged: {ts.task.task_name if ts.task else 'A task'}",
                "desc": f"{ts.team_member.username if ts.team_member else 'A member'} logged time.",
                "user": ts.team_member.username if ts.team_member else "Unknown"
            })
            
        activities.sort(key=lambda x: x["date"], reverse=True)
        recent_activities = activities[:8]

        return success_response(
            message="Dashboard statistics fetched successfully",
            data={
                "metrics": {
                    "totalActive": active_count,
                    "overdue": overdue_count,
                    "completed": completed_count,
                    "progress": progress
                },
                "statusData": [
                    item for item in [
                        {"name": "To-do", "value": status_map.get("PENDING", 0), "originalStatus": "PENDING"},
                        {"name": "In Progress", "value": status_map.get("IN_PROGRESS", 0), "originalStatus": "IN_PROGRESS"},
                        {"name": "In Review", "value": status_map.get("IN_REVIEW", 0), "originalStatus": "IN_REVIEW"},
                        {"name": "Hold", "value": status_map.get("HOLD", 0), "originalStatus": "HOLD"},
                        {"name": "Completed", "value": status_map.get("COMPLETED", 0), "originalStatus": "COMPLETED"}
                    ] if item["value"] > 0
                ],
                "workloadData": workload_data,
                "topCriticalTasks": top_critical_serialized,
                "recentActivity": recent_activities
            },
            status_code=status.HTTP_200_OK
        )



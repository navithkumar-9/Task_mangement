from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .roles import UserRole
from .models import (
    User_model,
    Task,
    Timesheet,
    TaskComment,
    SubTask,
    Notification,
    Announcement,
    AnnouncementAudience,
    EmployeeScorecard,
    ScorecardStatus,
)
from .emails import send_task_notification_email_async

User = get_user_model()


def serialize_team_leader(assigned_by):
    if not assigned_by:
        return None
    if assigned_by.role == "ADMIN":
        leader = assigned_by
    elif assigned_by.role == "TEAM_MEMBER" and assigned_by.created_by:
        leader = assigned_by.created_by
    else:
        leader = None

    if leader:
        return {
            "id": leader.id,
            "username": leader.username,
            "name": getattr(leader, "name", "") or "",
            "profile_picture": getattr(leader, "profile_picture", "") or "",
            "role": leader.role,
        }
    return None


class LoginSerializer(serializers.Serializer):
    user_name = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data["user_name"], password=data["password"])

        if not user:
            raise serializers.ValidationError("Invalid credentials")

        data["user"] = user

        return data


class CreateAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = User_model
        fields = ["user_name", "password", "email"]

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        request = self.context["request"]
        user = User_model.objects.create_user(
            username=validated_data["user_name"],
            password=validated_data["password"],
            email=validated_data["email"],
            role=UserRole.ADMIN.value,
            created_by=request.user,
        )
        return user


class CreateTeamLeaderSerializer(serializers.ModelSerializer):

    class Meta:
        model = User_model
        fields = ["user_name", "password", "email"]

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        request = self.context["request"]
        user = User_model.objects.create_user(
            username=validated_data["user_name"],
            password=validated_data["password"],
            email=validated_data["email"],
            role=UserRole.TEAM_MEMBER.value,
            created_by=request.user,
        )
        return user


class UpdateTeamMemberSerializer(serializers.ModelSerializer):

    class Meta:
        model = User_model
        fields = ["user_name", "email", "phone_number"]
        extra_kwargs = {
            "user_name": {"required": False},
            "email": {"required": False},
            "phone_number": {"required": False},
        }

    def validate_phone_number(self, value):
        if value is not None:
            phone_str = str(value)
            if len(phone_str) != 10:
                raise serializers.ValidationError(
                    "Phone number must be exactly 10 digits."
                )
            if phone_str[0] not in "6789":
                raise serializers.ValidationError(
                    "Indian phone number must start with 6, 7, 8, or 9."
                )
        return value

    def update(self, instance, validated_data):
        if "user_name" in validated_data:
            instance.username = validated_data["user_name"]
        if "email" in validated_data:
            instance.email = validated_data["email"]
        if "phone_number" in validated_data:
            instance.phone_number = validated_data["phone_number"]
        instance.save()
        return instance


class UpdateAdminSerializer(serializers.ModelSerializer):

    class Meta:
        model = User_model
        fields = ["user_name", "email", "phone_number"]
        extra_kwargs = {
            "user_name": {"required": False},
            "email": {"required": False},
            "phone_number": {"required": False},
        }

    def validate_phone_number(self, value):
        if value is not None:
            phone_str = str(value)
            if len(phone_str) != 10:
                raise serializers.ValidationError(
                    "Phone number must be exactly 10 digits."
                )
            if phone_str[0] not in "6789":
                raise serializers.ValidationError(
                    "Indian phone number must start with 6, 7, 8, or 9."
                )
        return value

    def update(self, instance, validated_data):
        if "user_name" in validated_data:
            instance.username = validated_data["user_name"]
        if "email" in validated_data:
            instance.email = validated_data["email"]
        if "phone_number" in validated_data:
            instance.phone_number = validated_data["phone_number"]
        instance.save()
        return instance


# task serilizer


class TaskCreateSerializer(serializers.ModelSerializer):

    assignee_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True
    )
    revised_due_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "project_name",
            "task_name",
            "description",
            "priority",
            "status",
            "due_date",
            "revised_due_date",
            "remarks",
            "assignee_ids",
        ]

    def validate_assignee_ids(self, value):
        request = self.context["request"]
        if not value:
            raise serializers.ValidationError(
                "At least one team member must be selected"
            )

        leader = request.user
        if request.user.role == UserRole.TEAM_MEMBER.value:
            leader = request.user.created_by

        # Retrieve valid IDs using a single bulk query
        valid_ids = set(User.objects.filter(
            id__in=value, role=UserRole.TEAM_MEMBER.value, created_by=leader
        ).values_list('id', flat=True))
        
        invalid_ids = set(value) - valid_ids
        if invalid_ids:
            raise serializers.ValidationError(f"Invalid team member IDs: {list(invalid_ids)}")

        return value

    def create(self, validated_data):
        assignee_ids = validated_data.pop("assignee_ids")
        validated_data.pop("revised_due_date", None)
        request = self.context["request"]

        task = Task.objects.create(assigned_by=request.user, **validated_data)

        # Retrieve selected assignees
        assignees_list = list(User.objects.filter(id__in=assignee_ids))
        # Only auto-add creator as assignee for TEAM_MEMBER (not for ADMIN)
        if request.user.role == UserRole.TEAM_MEMBER.value and request.user not in assignees_list:
            assignees_list.append(request.user)

        task.assignees.set(assignees_list)

        # Send email notifications to assignees asynchronously
        send_task_notification_email_async(task, request.user, assignees_list)

        return task

    def update(self, instance, validated_data):
        assignee_ids = validated_data.pop("assignee_ids", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if assignee_ids is not None:
            assignees = User.objects.filter(id__in=assignee_ids)
            instance.assignees.set(assignees)

        return instance


class TaskListSerializer(serializers.ModelSerializer):

    assignees = serializers.SerializerMethodField()

    assigned_by = serializers.SerializerMethodField()

    team_leader = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = "__all__"

    def get_assignees(self, obj):

        return [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": getattr(user, "name", "") or "",
                "profile_picture": getattr(user, "profile_picture", "") or "",
            }
            for user in obj.assignees.all()
        ]

    def get_assigned_by(self, obj):

        return {
            "id": obj.assigned_by.id,
            "username": obj.assigned_by.username,
            "email": obj.assigned_by.email,
            "name": getattr(obj.assigned_by, "name", "") or "",
            "profile_picture": getattr(obj.assigned_by, "profile_picture", "") or "",
        }

    def get_team_leader(self, obj):
        return serialize_team_leader(obj.assigned_by)


class TaskStatusUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Task
        fields = ["status"]


class TimesheetCreateSerializer(serializers.ModelSerializer):

    task_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Timesheet
        fields = [
            "id",
            "task_id",
            "description",
            "status",
            "start_time",
            "end_time",
        ]

    def validate_task_id(self, value):

        request = self.context["request"]

        try:
            self._task_obj = Task.objects.get(id=value, assignees=request.user)
        except Task.DoesNotExist:
            raise serializers.ValidationError("Invalid assigned task")

        return value

    def validate(self, data):
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time."}
            )
        return data

    def create(self, validated_data):

        request = self.context["request"]

        validated_data.pop("task_id")

        # Reuse the already fetched task object to avoid a redundant DB query
        task = getattr(self, "_task_obj", None)
        if not task:
            # Fallback if validation wasn't run for some reason
            task = Task.objects.get(id=self.initial_data.get("task_id"))

        timesheet = Timesheet.objects.create(
            task=task, team_member=request.user, **validated_data
        )

        return timesheet


class TimesheetUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Timesheet
        fields = [
            "description",
            "status",
            "start_time",
            "end_time",
        ]

    def validate(self, data):
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        # In case of update, one of them might be missing in payload, so check instance values
        if not start_time and self.instance:
            start_time = self.instance.start_time
        if not end_time and self.instance:
            end_time = self.instance.end_time

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time."}
            )
        return data


class TimesheetListSerializer(serializers.ModelSerializer):

    task = serializers.SerializerMethodField()

    team_member = serializers.SerializerMethodField()

    team_leader = serializers.SerializerMethodField()

    class Meta:
        model = Timesheet
        fields = "__all__"

    def get_task(self, obj):

        return {
            "id": obj.task.id,
            "project_name": obj.task.project_name,
            "task_name": obj.task.task_name,
            "priority": obj.task.priority,
            "assigned_by": {
                "id": obj.task.assigned_by.id,
                "username": obj.task.assigned_by.username,
                "name": getattr(obj.task.assigned_by, "name", "") or "",
                "profile_picture": getattr(obj.task.assigned_by, "profile_picture", "")
                or "",
            },
            "assignees": [
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "name": getattr(user, "name", "") or "",
                    "profile_picture": getattr(user, "profile_picture", "") or "",
                }
                for user in obj.task.assignees.all()
            ],
            "team_leader": serialize_team_leader(obj.task.assigned_by),
        }

    def get_team_member(self, obj):

        return {
            "id": obj.team_member.id,
            "username": obj.team_member.username,
            "email": obj.team_member.email,
            "name": getattr(obj.team_member, "name", "") or "",
            "profile_picture": getattr(obj.team_member, "profile_picture", "") or "",
        }

    def get_team_leader(self, obj):
        return serialize_team_leader(obj.task.assigned_by)


# ─── Comment / Activity Serializer ───


class TaskCommentSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = TaskComment
        fields = ["id", "user", "content", "created_at"]
        read_only_fields = ["id", "user", "created_at"]

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "name": getattr(obj.user, "name", "") or "",
            "profile_picture": getattr(obj.user, "profile_picture", "") or "",
        }


# ─── SubTask Serializer ───


class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ["id", "title", "is_completed", "created_at"]
        read_only_fields = ["id", "created_at"]


# ─── Full Task Detail Serializer (includes comments + subtasks) ───


class TaskDetailSerializer(serializers.ModelSerializer):
    assignees = serializers.SerializerMethodField()
    assigned_by = serializers.SerializerMethodField()
    comments = TaskCommentSerializer(many=True, read_only=True)
    subtasks = SubTaskSerializer(many=True, read_only=True)
    team_leader = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = "__all__"

    def get_assignees(self, obj):
        return [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": getattr(user, "name", "") or "",
                "profile_picture": getattr(user, "profile_picture", "") or "",
            }
            for user in obj.assignees.all()
        ]

    def get_assigned_by(self, obj):
        return {
            "id": obj.assigned_by.id,
            "username": obj.assigned_by.username,
            "email": obj.assigned_by.email,
            "name": getattr(obj.assigned_by, "name", "") or "",
            "profile_picture": getattr(obj.assigned_by, "profile_picture", "") or "",
        }

    def get_team_leader(self, obj):
        return serialize_team_leader(obj.assigned_by)


# ─── Notification Serializer ───


class NotificationSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    task_info = serializers.SerializerMethodField()
    comment_content = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "sender",
            "task_info",
            "comment_content",
            "message",
            "is_read",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sender",
            "task_info",
            "comment_content",
            "message",
            "created_at",
        ]

    def get_sender(self, obj):
        return {
            "id": obj.sender.id,
            "username": obj.sender.username,
            "name": getattr(obj.sender, "name", "") or "",
            "profile_picture": getattr(obj.sender, "profile_picture", "") or "",
        }

    def get_task_info(self, obj):
        if not obj.task:
            return None
        return {
            "id": obj.task.id,
            "task_name": obj.task.task_name,
            "project_name": obj.task.project_name,
        }

    def get_comment_content(self, obj):
        if obj.comment:
            return obj.comment.content
        return None


# ─── Announcement Serializers ───


class AnnouncementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ["id", "title", "message", "audience", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_audience(self, value):
        request = self.context["request"]
        user = request.user
        if user.role == "SUPER_ADMIN":
            if value not in ["ADMINS_ONLY", "ALL"]:
                raise serializers.ValidationError(
                    "Super Admin can only target ADMINS_ONLY or ALL."
                )
        elif user.role == "ADMIN":
            if value != "MY_TEAM":
                raise serializers.ValidationError("Admins can only target MY_TEAM.")
        else:
            raise serializers.ValidationError("Team Members cannot send announcements.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["sender"] = request.user
        return super().create(validated_data)


class AnnouncementUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ["title", "message"]


class AnnouncementListSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            "id",
            "sender",
            "title",
            "message",
            "audience",
            "created_at",
            "updated_at",
        ]

    def get_sender(self, obj):
        return {
            "id": obj.sender.id,
            "username": obj.sender.username,
            "name": getattr(obj.sender, "name", "") or "",
            "profile_picture": getattr(obj.sender, "profile_picture", "") or "",
            "role": obj.sender.role,
        }


class EmployeeScorecardSerializer(serializers.ModelSerializer):
    employee = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeScorecard
        fields = [
            "id",
            "employee",
            "month",
            "task_completion_rate",
            "working_hours",
            "quality_score",
            "attendance_score",
            "overall_score",
            "status",
            "admin_comments",
            "superadmin_comments",
            "created_at",
            "updated_at",
        ]

    def get_employee(self, obj):
        return {
            "id": obj.employee.id,
            "username": obj.employee.username,
            "name": getattr(obj.employee, "name", "") or "",
            "profile_picture": getattr(obj.employee, "profile_picture", "") or "",
        }


class EmployeeScorecardCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeScorecard
        fields = [
            "employee",
            "month",
            "task_completion_rate",
            "working_hours",
            "quality_score",
            "attendance_score",
            "status",
            "admin_comments",
            "superadmin_comments",
        ]
        extra_kwargs = {
            "task_completion_rate": {"required": False},
            "working_hours": {"required": False},
        }

    def validate_quality_score(self, value):
        if value < 0 or value > 5:
            raise serializers.ValidationError("Quality score must be between 0 and 5.")
        return value

    def validate_attendance_score(self, value):
        if value < 0 or value > 5:
            raise serializers.ValidationError(
                "Attendance score must be between 0 and 5."
            )
        return value

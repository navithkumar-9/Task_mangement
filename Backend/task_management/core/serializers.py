from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User_model
from .roles import UserRole
from .models import Task, Timesheet
from django.contrib.auth import get_user_model
from .emails import send_task_notification_email_async

User = get_user_model()


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
            raise serializers.ValidationError("At least one team member must be selected")

        for uid in value:
            try:
                User.objects.get(
                    id=uid, role=UserRole.TEAM_MEMBER.value, created_by=request.user
                )
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    f"Invalid team member with id {uid}"
                )

        return value

    def create(self, validated_data):
        assignee_ids = validated_data.pop("assignee_ids")
        validated_data.pop("revised_due_date", None)
        request = self.context["request"]

        task = Task.objects.create(assigned_by=request.user, **validated_data)

        assignees = User.objects.filter(id__in=assignee_ids)
        task.assignees.set(assignees)

        # Send email notifications to assignees asynchronously
        send_task_notification_email_async(task, request.user, assignees)

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

    class Meta:
        model = Task
        fields = "__all__"

    def get_assignees(self, obj):

        return [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            }
            for user in obj.assignees.all()
        ]

    def get_assigned_by(self, obj):

        return {
            "id": obj.assigned_by.id,
            "username": obj.assigned_by.username,
            "email": obj.assigned_by.email,
        }


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
            Task.objects.get(id=value, assignees=request.user)
        except Task.DoesNotExist:
            raise serializers.ValidationError("Invalid assigned task")

        return value

    def create(self, validated_data):

        request = self.context["request"]

        task_id = validated_data.pop("task_id")

        task = Task.objects.get(id=task_id)

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


class TimesheetListSerializer(serializers.ModelSerializer):

    task = serializers.SerializerMethodField()

    team_member = serializers.SerializerMethodField()

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
            }
        }

    def get_team_member(self, obj):

        return {
            "id": obj.team_member.id,
            "username": obj.team_member.username,
            "email": obj.team_member.email,
        }

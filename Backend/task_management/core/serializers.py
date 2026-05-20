from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User_model
from .roles import UserRole
from .models import Task
from django.contrib.auth import get_user_model

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
        fields = ["user_name", "password","email"]

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

#task serilizer

class TaskCreateSerializer(serializers.ModelSerializer):

    assignee_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "project_name",
            "task_name",
            "description",
            "priority",
            "due_date",
            "assignee_id",
        ]

    def validate_assignee_id(self, value):

        request = self.context["request"]

        try:
            user = User.objects.get(
                id=value,
                role=UserRole.TEAM_MEMBER.value,
                created_by=request.user
            )
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "Invalid team member"
            )

        return value

    def create(self, validated_data):

        assignee_id = validated_data.pop("assignee_id")

        assignee = User.objects.get(id=assignee_id)

        request = self.context["request"]

        task = Task.objects.create(
            assignee=assignee,
            assigned_by=request.user,
            **validated_data
        )

        return task


class TaskListSerializer(serializers.ModelSerializer):

    assignee = serializers.SerializerMethodField()

    assigned_by = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = "__all__"

    def get_assignee(self, obj):

        return {
            "id": obj.assignee.id,
            "username": obj.assignee.username,
            "email": obj.assignee.email,
        }

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
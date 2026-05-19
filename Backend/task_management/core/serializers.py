from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User_model
from .roles import UserRole


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

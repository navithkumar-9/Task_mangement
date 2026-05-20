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
)
from .permissions import IsAdmin, IsSuperAdmin
from .roles import UserRole
from .response import success_response, error_response
from .pagination import CustomPagination
from django.db.models import Q

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

        queryset = User.objects.filter(
            role=UserRole.ADMIN.value
        ).order_by("-id")

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search)
            )

        paginator = CustomPagination()

        paginated_queryset = paginator.paginate_queryset(
            queryset,
            request
        )

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

        return paginator.get_paginated_response({
            "isV1": True,
            "success": True,
            "message": "Admins fetched successfully",
            "data": data,
        })


class TeamMemberListForSuperAdminView(APIView):

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):

        search = request.GET.get("search")

        queryset = User.objects.filter(
            role=UserRole.TEAM_MEMBER.value
        ).select_related("created_by").order_by("-id")

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search)
            )

        paginator = CustomPagination()

        paginated_queryset = paginator.paginate_queryset(
            queryset,
            request
        )

        data = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
                "role": user.role,
                "created_by": (
                    user.created_by.username
                    if user.created_by else None
                )
            }
            for user in paginated_queryset
        ]

        return paginator.get_paginated_response({
            "isV1": True,
            "success": True,
            "message": "Team members fetched successfully",
            "data": data,
        })


class TeamMemberListForAdminView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):

        search = request.GET.get("search")

        queryset = User.objects.filter(
            role=UserRole.TEAM_MEMBER.value,
            created_by=request.user
        ).order_by("-id")

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search)
            )

        paginator = CustomPagination()

        paginated_queryset = paginator.paginate_queryset(
            queryset,
            request
        )

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

        return paginator.get_paginated_response({
            "isV1": True,
            "success": True,
            "message": "Your team members fetched successfully",
            "data": data,
        })

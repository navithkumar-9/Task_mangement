from django.urls import path

from .views import (
    SuperAdminLoginView,
    LoginView,
    CreateAdminView,
    CreateTeamLeaderView,
    ProfileView,
    AdminListView,
    TeamMemberListForSuperAdminView,
    TeamMemberListForAdminView,
    CreateTaskView,
    AdminTaskListView,
    TeamMemberTaskListView,
    UpdateTaskStatusView,
    SuperAdminTaskProgressView,
)

urlpatterns = [
    path("super-admin/login/", SuperAdminLoginView.as_view()),
    path("login/", LoginView.as_view()),
    path("create-admin/", CreateAdminView.as_view()),
    path("create-team-member/", CreateTeamLeaderView.as_view()),
    path("profile/", ProfileView.as_view()),
    # data listing
    path(
        "admins/",
        AdminListView.as_view(),
    ),
    path(
        "super-admin/team-members/",
        TeamMemberListForSuperAdminView.as_view(),
    ),
    path(
        "admin/team-members/",
        TeamMemberListForAdminView.as_view(),
    ),
    # task creation
    path(
        "tasks/create/",
        CreateTaskView.as_view(),
    ),
    path(
        "tasks/admin/",
        AdminTaskListView.as_view(),
    ),
    path(
        "tasks/my-tasks/",
        TeamMemberTaskListView.as_view(),
    ),
    path(
        "tasks/update-status/<int:task_id>/",
        UpdateTaskStatusView.as_view(),
    ),
    path(
        "tasks/progress/",
        SuperAdminTaskProgressView.as_view(),
    ),
]

from django.urls import path

from .views import (
    SuperAdminLoginView,
    LoginView,
    CreateAdminView,
    CreateTeamLeaderView,
    ProfileView,
    AdminListView,
    AdminDetailView,
    TeamMemberListForSuperAdminView,
    TeamMemberListForAdminView,
    TeamMemberDetailView,
    CreateTaskView,
    AdminTaskListView,
    AdminTaskDetailView,
    TeamMemberTaskListView,
    UpdateTaskStatusView,
    SuperAdminTaskProgressView,
    CreateTimesheetView,
    UpdateTimesheetView,
    AdminTimesheetListView,
    SuperAdminTimesheetListView,
    TeamMemberTimesheetListView,
    TaskFullDetailView,
    TaskCommentListCreateView,
    SubTaskListCreateView,
    SubTaskUpdateDeleteView,
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    CreateAnnouncementView,
    AnnouncementListView,
    AnnouncementDetailView,
    SuperAdminAnnouncementListView,
    SuperAdminTeamMemberDetailView,
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
        "admins/<int:admin_id>/",
        AdminDetailView.as_view(),
    ),
    path(
        "super-admin/team-members/",
        TeamMemberListForSuperAdminView.as_view(),
    ),
    path(
        "super-admin/team-members/<int:member_id>/",
        SuperAdminTeamMemberDetailView.as_view(),
    ),
    path(
        "admin/team-members/",
        TeamMemberListForAdminView.as_view(),
    ),
    path(
        "admin/team-members/<int:member_id>/",
        TeamMemberDetailView.as_view(),
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
        "tasks/<int:task_id>/",
        AdminTaskDetailView.as_view(),
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
    # timesheets
    path(
        "timesheets/create/",
        CreateTimesheetView.as_view(),
    ),
    path(
        "timesheets/<int:timesheet_id>/",
        UpdateTimesheetView.as_view(),
    ),
    path(
        "timesheets/admin/",
        AdminTimesheetListView.as_view(),
    ),
    path(
        "timesheets/super-admin/",
        SuperAdminTimesheetListView.as_view(),
    ),
    path(
        "timesheets/my-timesheets/",
        TeamMemberTimesheetListView.as_view(),
    ),
    # task detail, comments, subtasks
    path(
        "tasks/<int:task_id>/detail/",
        TaskFullDetailView.as_view(),
    ),
    path(
        "tasks/<int:task_id>/comments/",
        TaskCommentListCreateView.as_view(),
    ),
    path(
        "tasks/<int:task_id>/subtasks/",
        SubTaskListCreateView.as_view(),
    ),
    path(
        "tasks/<int:task_id>/subtasks/<int:subtask_id>/",
        SubTaskUpdateDeleteView.as_view(),
    ),
    # notifications
    path(
        "notifications/",
        NotificationListView.as_view(),
    ),
    path(
        "notifications/unread-count/",
        NotificationUnreadCountView.as_view(),
    ),
    path(
        "notifications/<int:notification_id>/read/",
        NotificationMarkReadView.as_view(),
    ),
    path(
        "notifications/mark-all-read/",
        NotificationMarkAllReadView.as_view(),
    ),
    # announcements
    path("announcements/create/", CreateAnnouncementView.as_view()),
    path("announcements/", AnnouncementListView.as_view()),
    path("announcements/<int:announcement_id>/", AnnouncementDetailView.as_view()),
    path("announcements/super-admin/", SuperAdminAnnouncementListView.as_view()),
]

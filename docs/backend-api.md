# Backend API Documentation

## Executive Summary

The backend is a Django REST Framework API for a role-based task management system. It supports Super Admin, Admin, and Team Member workflows including user management, task assignment, status tracking, timesheets, task comments, subtasks, notifications, and announcements.

The API is implemented in `Backend/task_management/core` with explicit `APIView` classes and a project-level `/api/` route prefix.

## Technology Stack

| Area            | Implementation                                                                  |
| --------------- | ------------------------------------------------------------------------------- |
| Framework       | Django, Django REST Framework                                                   |
| Authentication  | `rest_framework_simplejwt` JWT bearer tokens                                    |
| Database        | MySQL via `mysqlclient`                                                         |
| CORS            | `django-cors-headers`                                                           |
| Email           | SMTP, configured for Brevo-compatible defaults                                  |
| Response format | Custom JSON envelopes through `success_response` and `error_response`           |
| Pagination      | DRF `PageNumberPagination`, page size 10, `page_size` query parameter up to 100 |

## Environment Variables

| Variable               | Purpose                          | Default or Behavior                        |
| ---------------------- | -------------------------------- | ------------------------------------------ |
| `DJANGO_SECRET_KEY`    | Django signing key               | Development fallback exists in settings    |
| `DJANGO_DEBUG`         | Enables debug mode               | `True`                                     |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hosts    | `*`                                        |
| `MYSQL_DB`             | MySQL database name              | `task_management`                          |
| `MYSQL_USER`           | MySQL user                       | `root`                                     |
| `MYSQL_PASSWORD`       | MySQL password                   | `password`                                 |
| `MYSQL_HOST`           | MySQL host                       | `127.0.0.1`                                |
| `MYSQL_PORT`           | MySQL port                       | `3306`                                     |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins | Allows all origins only when debug is true |
| `SUPER_ADMIN_USERNAME` | Super Admin login username       | Required for Super Admin login             |
| `SUPER_ADMIN_PASSWORD` | Super Admin login password       | Required for Super Admin login             |
| `EMAIL_HOST`           | SMTP host                        | `smtp-relay.brevo.com`                     |
| `EMAIL_PORT`           | SMTP port                        | `587`                                      |
| `EMAIL_USE_TLS`        | SMTP TLS flag                    | `True`                                     |
| `EMAIL_HOST_USER`      | SMTP username                    | Empty                                      |
| `EMAIL_HOST_PASSWORD`  | SMTP password                    | Empty                                      |
| `DEFAULT_FROM_EMAIL`   | Sender email                     | Uses `EMAIL_HOST_USER`                     |
| `ELASTICSEARCH_ENABLED` | Enables Elasticsearch-backed global search | `False`                          |
| `ELASTICSEARCH_HOST`   | Elasticsearch URL                | `http://localhost:9200`                   |
| `ELASTICSEARCH_USER`   | Elasticsearch username           | Empty                                      |
| `ELASTICSEARCH_PASSWORD` | Elasticsearch password         | Empty                                      |
| `ELASTICSEARCH_TIMEOUT` | Elasticsearch request timeout in seconds | `0.2`                            |
| `ELASTICSEARCH_CHECK_TIMEOUT` | Elasticsearch health-check timeout in seconds | `0.03`                 |
| `ELASTICSEARCH_CHECK_INTERVAL` | Seconds to cache ES availability checks | `60`                    |

## Authentication

All protected endpoints use this HTTP header:

```http
Authorization: Bearer <access_token>
```

Tokens are returned from:

| Endpoint                       | Audience                     |
| ------------------------------ | ---------------------------- |
| `POST /api/super-admin/login/` | Super Admin portal           |
| `POST /api/login/`             | Admin and Team Member portal |

The access token is valid for 1 day and the refresh token is valid for 7 days.

## Search

Global search uses Elasticsearch when `ELASTICSEARCH_ENABLED=True` and the configured
`ELASTICSEARCH_HOST` is reachable. If Elasticsearch is disabled or unavailable, the
API falls back to role-scoped database search and caches the response briefly.

After enabling Elasticsearch for an existing database, rebuild the search indexes:

```bash
python manage.py rebuild_search_index
```

## Roles And Permissions

| Role                                     | Capabilities                                                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPER_ADMIN`                            | Logs in through environment-backed credentials, creates admins, views global users, global tasks, global timesheets, and global announcements.       |
| `ADMIN`                                  | Creates team members, manages own team, creates and manages team tasks, views team timesheets, sends announcements to own team.                      |
| `TEAM_MEMBER`                            | Views assigned tasks, updates allowed task statuses, creates own timesheets, comments on accessible tasks, receives notifications and announcements. |
| `TEAM_MEMBER` with `can_crud_tasks=true` | Can create/manage tasks for their leader's team and can see broader task/timesheet data allowed by backend rules.                                    |

## Response Contract

Standard success response:

```json
{
    "isV1": true,
    "success": true,
    "message": "Operation completed",
    "data": {}
}
```

Standard error response:

```json
{
    "isV1": true,
    "success": false,
    "message": "Validation failed",
    "errors": {}
}
```

Paginated endpoints use DRF pagination:

```json
{
    "count": 25,
    "next": "http://localhost:8000/api/admins/?page=2",
    "previous": null,
    "results": {
        "isV1": true,
        "success": true,
        "message": "Admins fetched successfully",
        "data": []
    }
}
```

## Business Rules

| Domain                   | Rule                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Admin creation           | Only Super Admin can create Admin users.                                                                                                 |
| Team member creation     | Only Admin can create Team Members.                                                                                                      |
| Team member phone number | Must be 10 digits and start with 6, 7, 8, or 9 when supplied.                                                                            |
| Task creation            | Requires at least one valid team member in `assignee_ids`.                                                                               |
| Task assignment          | Admins assign to their own team. Permitted team members assign within their leader's team.                                               |
| Task completion          | Non-admin team members cannot mark a task as `COMPLETED` through `/tasks/update-status/{task_id}/`.                                      |
| Timesheet ownership      | A team member can create timesheets only for tasks assigned to them.                                                                     |
| Timesheet update         | Timesheets can be updated only by the owning team member and only within 24 hours of creation.                                           |
| Comments                 | Accessible task participants can add comments. Comment creation sends notifications to the task creator and assignees except the sender. |
| Notifications            | Notifications older than 24 hours are deleted when the notifications list is fetched.                                                    |
| Announcements            | Super Admin can target `ADMINS_ONLY` or `ALL`. Admin can target only `MY_TEAM`. Team Members cannot create announcements.                |

## Endpoint Matrix

### Authentication

| Method | Path                      | Auth                   | Purpose                                                     |
| ------ | ------------------------- | ---------------------- | ----------------------------------------------------------- |
| `POST` | `/api/super-admin/login/` | Public                 | Authenticate Super Admin using environment credentials.     |
| `POST` | `/api/login/`             | Public                 | Authenticate Admin or Team Member by username and password. |
| `GET`  | `/api/profile/`           | Any authenticated user | Fetch current user's profile.                               |
| `PUT`  | `/api/profile/`           | Any authenticated user | Update name, employee ID, profile picture, or password.     |

### User Management

| Method   | Path                                         | Auth                           | Purpose                                                                        |
| -------- | -------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `POST`   | `/api/create-admin/`                         | Super Admin                    | Create an Admin.                                                               |
| `GET`    | `/api/admins/`                               | Super Admin                    | List Admin users. Supports `search`, `page`, `page_size`.                      |
| `GET`    | `/api/admins/{admin_id}/`                    | Super Admin                    | Fetch one Admin.                                                               |
| `PUT`    | `/api/admins/{admin_id}/`                    | Super Admin                    | Update Admin username, email, or phone.                                        |
| `DELETE` | `/api/admins/{admin_id}/`                    | Super Admin                    | Delete an Admin.                                                               |
| `POST`   | `/api/create-team-member/`                   | Admin                          | Create a Team Member.                                                          |
| `GET`    | `/api/admin/team-members/`                   | Admin or permitted Team Member | List team members in the visible team. Supports `search`, `page`, `page_size`. |
| `GET`    | `/api/admin/team-members/{member_id}/`       | Admin                          | Fetch one team member owned by the Admin.                                      |
| `PUT`    | `/api/admin/team-members/{member_id}/`       | Admin                          | Update a team member owned by the Admin.                                       |
| `DELETE` | `/api/admin/team-members/{member_id}/`       | Admin                          | Delete a team member owned by the Admin.                                       |
| `GET`    | `/api/super-admin/team-members/`             | Super Admin                    | List all team members. Supports `search`, `page`, `page_size`.                 |
| `GET`    | `/api/super-admin/team-members/{member_id}/` | Super Admin                    | Fetch one team member.                                                         |
| `PUT`    | `/api/super-admin/team-members/{member_id}/` | Super Admin                    | Update team member identity and `can_crud_tasks`.                              |
| `DELETE` | `/api/super-admin/team-members/{member_id}/` | Super Admin                    | Delete a team member.                                                          |

### Tasks

| Method   | Path                                  | Auth                            | Purpose                                                                                                      |
| -------- | ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `POST`   | `/api/tasks/create/`                  | Admin or permitted Team Member  | Create a task and notify assignees by email.                                                                 |
| `GET`    | `/api/tasks/admin/`                   | Admin or permitted Team Member  | List managed tasks. Supports `search`, `completed`, `date`, `project`, `employee_name`, `page`, `page_size`. |
| `PATCH`  | `/api/tasks/{task_id}/`               | Admin or permitted Team Member  | Update a task.                                                                                               |
| `DELETE` | `/api/tasks/{task_id}/`               | Admin or permitted Team Member  | Delete a task.                                                                                               |
| `GET`    | `/api/tasks/my-tasks/`                | Any authenticated user          | List tasks assigned to current user. Supports `search`.                                                      |
| `PATCH`  | `/api/tasks/update-status/{task_id}/` | Assigned Team Member            | Update task status except `COMPLETED`.                                                                       |
| `GET`    | `/api/tasks/progress/`                | Super Admin                     | Global task progress list. Supports `search`.                                                                |
| `GET`    | `/api/tasks/{task_id}/detail/`        | Task participant or Super Admin | Fetch task with comments and subtasks.                                                                       |

### Task Comments And Subtasks

| Method   | Path                                          | Auth                            | Purpose                                 |
| -------- | --------------------------------------------- | ------------------------------- | --------------------------------------- |
| `GET`    | `/api/tasks/{task_id}/comments/`              | Task participant or Super Admin | List comments.                          |
| `POST`   | `/api/tasks/{task_id}/comments/`              | Task participant or Super Admin | Add a comment and create notifications. |
| `GET`    | `/api/tasks/{task_id}/subtasks/`              | Any authenticated user          | List subtasks for a task.               |
| `POST`   | `/api/tasks/{task_id}/subtasks/`              | Admin or permitted Team Member  | Create a subtask.                       |
| `PATCH`  | `/api/tasks/{task_id}/subtasks/{subtask_id}/` | Any authenticated user          | Toggle or set subtask completion.       |
| `DELETE` | `/api/tasks/{task_id}/subtasks/{subtask_id}/` | Admin or permitted Team Member  | Delete a subtask.                       |

### Timesheets

| Method  | Path                              | Auth                   | Purpose                                                                     |
| ------- | --------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `POST`  | `/api/timesheets/create/`         | Assigned Team Member   | Create a timesheet for an assigned task.                                    |
| `PATCH` | `/api/timesheets/{timesheet_id}/` | Timesheet owner        | Update a timesheet within 24 hours.                                         |
| `PUT`   | `/api/timesheets/{timesheet_id}/` | Timesheet owner        | Same behavior as PATCH.                                                     |
| `GET`   | `/api/timesheets/admin/`          | Admin                  | List timesheets for the Admin's team. Supports date range and text filters. |
| `GET`   | `/api/timesheets/super-admin/`    | Super Admin            | List all timesheets. Supports date range and text filters.                  |
| `GET`   | `/api/timesheets/my-timesheets/`  | Any authenticated user | List own timesheets. Permitted members also see tasks they assigned.        |

Timesheet filters:

| Query Parameter | Applies To                   | Description                                    |
| --------------- | ---------------------------- | ---------------------------------------------- |
| `date`          | All timesheet list endpoints | Exact date filter against `start_time`.        |
| `start_date`    | All timesheet list endpoints | Start of datetime range. Used with `end_date`. |
| `end_date`      | All timesheet list endpoints | End of datetime range. Used with `start_date`. |
| `task_name`     | All timesheet list endpoints | Case-insensitive task-name filter.             |
| `project_name`  | All timesheet list endpoints | Case-insensitive project-name filter.          |
| `employee_name` | All timesheet list endpoints | Case-insensitive username/name filter.         |

### Notifications

| Method  | Path                                         | Auth                   | Purpose                                                                    |
| ------- | -------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `GET`   | `/api/notifications/`                        | Any authenticated user | List current user's notifications. Supports `unread`, `page`, `page_size`. |
| `GET`   | `/api/notifications/unread-count/`           | Any authenticated user | Fetch unread notification count.                                           |
| `PATCH` | `/api/notifications/{notification_id}/read/` | Notification recipient | Mark one notification as read.                                             |
| `PATCH` | `/api/notifications/mark-all-read/`          | Any authenticated user | Mark all current user's notifications as read.                             |

### Announcements

| Method   | Path                                    | Auth                   | Purpose                                                                                |
| -------- | --------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `POST`   | `/api/announcements/create/`            | Super Admin or Admin   | Create an announcement and notify its audience.                                        |
| `GET`    | `/api/announcements/`                   | Any authenticated user | List announcements visible to the current user. Supports `title`, `page`, `page_size`. |
| `PUT`    | `/api/announcements/{announcement_id}/` | Announcement sender    | Update announcement title and message.                                                 |
| `DELETE` | `/api/announcements/{announcement_id}/` | Announcement sender    | Delete an announcement.                                                                |
| `GET`    | `/api/announcements/super-admin/`       | Super Admin            | List all announcements. Supports `title`, `page`, `page_size`.                         |

## Canonical Enums

Task statuses:

```text
PENDING
IN_PROGRESS
HOLD
IN_REVIEW
COMPLETED
```

Task priorities:

```text
LOW
MEDIUM
HIGH
```

Announcement audiences:

```text
ADMINS_ONLY
ALL
MY_TEAM
```

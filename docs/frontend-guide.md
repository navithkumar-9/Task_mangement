# Frontend Documentation

## Executive Summary

The frontend is split into two Vite React applications that consume the same Django REST API:

| App                | Location                       | Audience                | Purpose                                                                                                                 |
| ------------------ | ------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Admin Portal       | `Frontend/frontend_admin`      | Admins and Team Members | Team management, task board, timesheets, notifications, announcements, profile settings.                                |
| Super Admin Portal | `Frontend/frontend_superadmin` | Super Admins            | Admin creation, global user management, global task progress, global timesheet review, announcements, profile settings. |

Both apps use Axios with a shared response-interceptor pattern, React Router for routing, localStorage for token persistence, and the backend `/api` prefix by default.

## Runtime Setup

Install and run each frontend from its own folder:

```bash
npm install
npm run dev
```

Set this variable when the API is not served from the same origin:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

When omitted, both apps use:

```text
/api
```

## Shared Frontend Architecture

| Concern            | Admin Portal                        | Super Admin Portal                  |
| ------------------ | ----------------------------------- | ----------------------------------- |
| Axios client       | `src/api/axios.js`                  | `src/api/axios.js`                  |
| Auth context       | `src/context/AuthContext.jsx`       | `src/context/AuthContext.jsx`       |
| Route protection   | `src/components/ProtectedRoute.jsx` | `src/components/ProtectedRoute.jsx` |
| Layout shell       | `src/components/Layout.jsx`         | `src/components/Layout.jsx`         |
| Sidebar navigation | `src/components/Sidebar.jsx`        | `src/components/Sidebar.jsx`        |
| API base env       | `VITE_API_BASE_URL`                 | `VITE_API_BASE_URL`                 |
| Token storage key  | `admin_tokens`                      | `sa_tokens`                         |
| User storage key   | `admin_user`                        | `sa_user`                           |

Both Axios clients:

1. Read the access token from localStorage.
2. Attach `Authorization: Bearer <access_token>`.
3. Clear local auth state on `401`.
4. Redirect the browser to `/login`.

## Admin Portal Routes

| Route              | Component            | Primary APIs                                                                                                                                     | Notes                                                            |
| ------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `/login`           | `Login.jsx`          | `POST /login/`                                                                                                                                   | Authenticates Admin or Team Member.                              |
| `/dashboard`       | `Dashboard.jsx`      | `GET /profile/`, task/timesheet list APIs                                                                                                        | Role-aware summary/dashboard.                                    |
| `/tasks`           | `Tasks.jsx`          | `GET /tasks/admin/`, `GET /tasks/my-tasks/`, `POST /tasks/create/`, `PATCH /tasks/{id}/`, `PATCH /tasks/update-status/{id}/`, comments, subtasks | Kanban task board with create/edit/status/comment/subtask flows. |
| `/completed-tasks` | `CompletedTasks.jsx` | `GET /tasks/admin/?completed=true`, comments, subtasks                                                                                           | Admin archive for completed tasks.                               |
| `/timesheets`      | `Timesheet.jsx`      | `GET /timesheets/admin/`, `GET /timesheets/my-timesheets/`, `POST /timesheets/create/`, `PUT /timesheets/{id}/`                                  | Admin sees team timesheets. Team Member logs own time.           |
| `/announcements`   | `Announcements.jsx`  | `GET /announcements/`, `POST /announcements/create/`, `PUT /announcements/{id}/`, `DELETE /announcements/{id}/`                                  | Admin can publish to `MY_TEAM`.                                  |
| `/create-member`   | `CreateMember.jsx`   | `POST /create-team-member/`                                                                                                                      | Admin creates Team Members.                                      |
| `/team`            | `TeamList.jsx`       | `GET /admin/team-members/`, `PUT /admin/team-members/{id}/`, `DELETE /admin/team-members/{id}/`                                                  | Admin manages own team.                                          |
| `/settings`        | `Settings.jsx`       | `GET /profile/`, `PUT /profile/`                                                                                                                 | Profile picture, name, employee ID, password updates.            |
| `/calendar`        | `Calendar.jsx`       | Task list APIs                                                                                                                                   | Calendar-oriented task view.                                     |

## Super Admin Portal Routes

| Route             | Component           | Primary APIs                                                                                                          | Notes                                                             |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `/login`          | `Login.jsx`         | `POST /super-admin/login/`                                                                                            | Authenticates against environment-backed Super Admin credentials. |
| `/dashboard`      | `Dashboard.jsx`     | `GET /profile/`, global task/timesheet APIs                                                                           | Global summary/dashboard.                                         |
| `/create-admin`   | `CreateAdmin.jsx`   | `POST /create-admin/`                                                                                                 | Creates Admin users.                                              |
| `/users`          | `ManageUsers.jsx`   | `GET /admins/`, `GET /super-admin/team-members/`, `PUT /admins/{id}/`, `PUT /super-admin/team-members/{id}/`, deletes | Global Admin and Team Member management.                          |
| `/tasks-progress` | `TaskProgress.jsx`  | `GET /tasks/progress/`                                                                                                | Read-only global task progress view.                              |
| `/timesheet`      | `Timesheet.jsx`     | `GET /timesheets/super-admin/`                                                                                        | Global timesheet review with filters.                             |
| `/announcements`  | `Announcements.jsx` | `GET /announcements/`, `POST /announcements/create/`, `PUT /announcements/{id}/`, `DELETE /announcements/{id}/`       | Super Admin can target `ADMINS_ONLY` or `ALL`.                    |
| `/settings`       | `Settings.jsx`      | `GET /profile/`, `PUT /profile/`                                                                                      | Super Admin profile settings.                                     |
| `/calendar`       | `Calendar.jsx`      | `GET /tasks/progress/`                                                                                                | Global task calendar view.                                        |

## Role-Aware UI Behavior

| User Type                         | UI Behavior                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin                             | Can create team members, manage team list, create/edit/delete team tasks, mark tasks completed, view team timesheets, publish team announcements. |
| Team Member                       | Can view assigned tasks, move allowed task statuses, create and update own timesheets, comment on accessible tasks, and view announcements.       |
| Team Member with `can_crud_tasks` | Gets task creation/management flows where backend permission allows it.                                                                           |
| Super Admin                       | Uses separate portal for global visibility and user administration.                                                                               |

## API Consumption Patterns

### Pagination Handling

The frontend defensively handles all of these response shapes:

```js
res.data.results.data;
res.data.data;
res.data.results;
res.data;
```

The canonical backend paginated shape is:

```json
{
    "count": 10,
    "next": null,
    "previous": null,
    "results": {
        "isV1": true,
        "success": true,
        "message": "Fetched successfully",
        "data": []
    }
}
```

### Date And Time Handling

Timesheet screens convert local date selections to ISO strings before sending `start_date` and `end_date` filters. Timesheet creation sends `start_time` and `end_time` as ISO timestamps.

### Client-Side Filters

Some screens load large result sets with `page_size=1000` to build local filter dropdowns. The backend caps `page_size` at 100, so a production hardening pass should align frontend assumptions with the backend maximum or introduce dedicated filter-option endpoints.

## Frontend To Backend Dependency Matrix

| Feature            | Frontend Components                                                      | Backend Endpoints                                                                                                          |
| ------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Authentication     | `Login.jsx`, `AuthContext.jsx`, `ProtectedRoute.jsx`                     | `/login/`, `/super-admin/login/`, `/profile/`                                                                              |
| User management    | `CreateAdmin.jsx`, `CreateMember.jsx`, `ManageUsers.jsx`, `TeamList.jsx` | `/create-admin/`, `/create-team-member/`, `/admins/`, `/admin/team-members/`, `/super-admin/team-members/`                 |
| Task board         | `Tasks.jsx`, `CompletedTasks.jsx`, `Calendar.jsx`, `TaskProgress.jsx`    | `/tasks/create/`, `/tasks/admin/`, `/tasks/my-tasks/`, `/tasks/{id}/`, `/tasks/update-status/{id}/`, `/tasks/progress/`    |
| Task collaboration | `Tasks.jsx`, `CompletedTasks.jsx`                                        | `/tasks/{id}/comments/`, `/tasks/{id}/subtasks/`, `/tasks/{id}/subtasks/{subtask_id}/`                                     |
| Timesheets         | `Timesheet.jsx` in both apps                                             | `/timesheets/create/`, `/timesheets/{id}/`, `/timesheets/admin/`, `/timesheets/super-admin/`, `/timesheets/my-timesheets/` |
| Notifications      | `NotificationPopup.jsx`                                                  | `/notifications/`, `/notifications/unread-count/`, `/notifications/{id}/read/`, `/notifications/mark-all-read/`            |
| Announcements      | `Announcements.jsx` in both apps                                         | `/announcements/`, `/announcements/create/`, `/announcements/{id}/`, `/announcements/super-admin/`                         |
| Profile settings   | `Settings.jsx`, `Sidebar.jsx`, `Dashboard.jsx`                           | `/profile/`                                                                                                                |

## Operational Notes

| Area           | Note                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Auth redirects | A backend `401` clears token and user localStorage keys and sends the browser to `/login`.                                               |
| Token refresh  | The frontend stores refresh tokens but does not currently perform automatic refresh. Users must sign in again after access-token expiry. |
| CORS           | Production deployments should set `CORS_ALLOWED_ORIGINS` explicitly for both frontend origins.                                           |
| Build command  | Each frontend uses `npm run build`.                                                                                                      |
| Static assets  | Logo and favicon assets are located in each app's `public` directory.                                                                    |
| Styling        | Both apps use app-level CSS files and repeated class naming from extracted/generated styles.                                             |

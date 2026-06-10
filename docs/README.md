# Task Management Documentation

This directory contains professional, hand-audited documentation for the Task Management platform. The documentation is based on the current Django REST backend and both React frontend applications.

## Document Index

| Document                               | Purpose                                                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [openapi.yaml](openapi.yaml)           | Swagger/OpenAPI 3.0 specification for the backend REST API. Import this into Swagger UI, Redoc, Postman, Insomnia, or Stoplight. |
| [backend-api.md](backend-api.md)       | Human-readable backend API documentation, including roles, response contracts, filters, business rules, and environment setup.   |
| [frontend-guide.md](frontend-guide.md) | Frontend architecture and route documentation for the Admin and Super Admin Vite React apps.                                     |

## System Overview

The platform is split into three deployable surfaces:

| Surface            | Location                       | Technology                                            | Primary Users           |
| ------------------ | ------------------------------ | ----------------------------------------------------- | ----------------------- |
| Backend API        | `Backend/task_management`      | Django, Django REST Framework, Simple JWT, MySQL      | All clients             |
| Admin Portal       | `Frontend/frontend_admin`      | Vite, React, Axios, React Router, Bootstrap, Recharts | Admins and Team Members |
| Super Admin Portal | `Frontend/frontend_superadmin` | Vite, React, Axios, React Router, Bootstrap, Recharts | Super Admins            |

## Swagger Usage

1. Start the backend API from `Backend/task_management`.
2. Import [openapi.yaml](openapi.yaml) into a Swagger-compatible tool.
3. Set the server URL to your active backend environment if it differs from `http://localhost:8000/api`.
4. Authenticate with either `/login/` or `/super-admin/login/`.
5. Use the returned access token as `Bearer <access_token>` for secured endpoints.

## Runtime Defaults

| Item                    | Default                     |
| ----------------------- | --------------------------- |
| API prefix              | `/api`                      |
| Backend local URL       | `http://localhost:8000/api` |
| Frontend API env var    | `VITE_API_BASE_URL`         |
| JWT access lifetime     | 1 day                       |
| JWT refresh lifetime    | 7 days                      |
| Default pagination size | 10                          |
| Maximum pagination size | 100                         |

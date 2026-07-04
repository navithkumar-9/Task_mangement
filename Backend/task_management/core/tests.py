import datetime

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import Task, TaskStatus, TaskPriority
from core.roles import UserRole

User = get_user_model()


class TaskCRUDPermissionTestCase(APITestCase):

    def setUp(self):
        # Create Admin
        self.admin = User.objects.create_user(
            username="test_admin_crud",
            email="admin_crud@test.com",
            password="SecurePassword123!",
            role=UserRole.ADMIN.value,
        )

        # Create CRUD Team Members under self.admin
        self.crud_member_1 = User.objects.create_user(
            username="crud_member_1",
            email="crud1@test.com",
            password="SecurePassword123!",
            role=UserRole.TEAM_MEMBER.value,
            created_by=self.admin,
            can_crud_tasks=True,
        )
        self.crud_member_2 = User.objects.create_user(
            username="crud_member_2",
            email="crud2@test.com",
            password="SecurePassword123!",
            role=UserRole.TEAM_MEMBER.value,
            created_by=self.admin,
            can_crud_tasks=True,
        )

        # Create normal Team Member under self.admin (no CRUD access)
        self.normal_member = User.objects.create_user(
            username="normal_member",
            email="normal@test.com",
            password="SecurePassword123!",
            role=UserRole.TEAM_MEMBER.value,
            created_by=self.admin,
            can_crud_tasks=False,
        )

    def test_admin_task_creation_excludes_admin_from_assignees(self):
        self.client.force_authenticate(user=self.admin)
        url = "/api/tasks/create/"
        payload = {
            "project_name": "Admin Project",
            "task_name": "Admin Task",
            "description": "Admin description",
            "priority": "HIGH",
            "status": "PENDING",
            "assignee_ids": [self.crud_member_1.id],
            "due_date": str(timezone.now().date()),
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        task_id = response.data["data"]["id"]
        task = Task.objects.get(id=task_id)

        # Verify admin is NOT in the assignees list
        assignee_ids = [u.id for u in task.assignees.all()]
        self.assertNotIn(self.admin.id, assignee_ids)
        self.assertIn(self.crud_member_1.id, assignee_ids)

    def test_crud_member_can_assign_other_mates_and_is_auto_added(self):
        self.client.force_authenticate(user=self.crud_member_1)
        url = "/api/tasks/create/"
        payload = {
            "project_name": "Member Project",
            "task_name": "Member Task",
            "description": "Member description",
            "priority": "MEDIUM",
            "status": "PENDING",
            "assignee_ids": [self.crud_member_2.id],
            "due_date": str(timezone.now().date()),
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        task_id = response.data["data"]["id"]
        task = Task.objects.get(id=task_id)

        # Verify both crud_member_2 (selected assignee) and crud_member_1 (creator) are assignees
        assignee_ids = [u.id for u in task.assignees.all()]
        self.assertIn(self.crud_member_2.id, assignee_ids)
        self.assertIn(self.crud_member_1.id, assignee_ids)
        # Verify admin is NOT an assignee
        self.assertNotIn(self.admin.id, assignee_ids)

    def test_crud_member_cannot_edit_other_member_tasks(self):
        # Create a task created by crud_member_1
        task = Task.objects.create(
            project_name="Shared Project",
            task_name="Task 1",
            description="Detail",
            assigned_by=self.crud_member_1,
            due_date=timezone.now().date(),
        )
        task.assignees.set([self.crud_member_1, self.crud_member_2])

        # crud_member_2 attempts to edit it
        self.client.force_authenticate(user=self.crud_member_2)
        url = f"/api/tasks/{task.id}/"
        payload = {
            "task_name": "Hacked Name"
        }
        response = self.client.patch(url, payload)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)  # Backend returns 404 because of task scoping in AdminTaskDetailView query

    def test_normal_member_cannot_create_task(self):
        self.client.force_authenticate(user=self.normal_member)
        url = "/api/tasks/create/"
        payload = {
            "project_name": "Normal Project",
            "task_name": "Normal Task",
            "description": "Normal description",
            "priority": "LOW",
            "status": "PENDING",
            "assignee_ids": [self.crud_member_1.id],
            "due_date": str(timezone.now().date()),
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class DashboardStatsTestCase(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user(
            username="dashboard_admin",
            email="dashboard_admin@test.com",
            password="SecurePassword123!",
            role=UserRole.ADMIN.value,
        )
        self.other_admin = User.objects.create_user(
            username="other_dashboard_admin",
            email="other_dashboard_admin@test.com",
            password="SecurePassword123!",
            role=UserRole.ADMIN.value,
        )
        self.member = User.objects.create_user(
            username="dashboard_member",
            email="dashboard_member@test.com",
            password="SecurePassword123!",
            role=UserRole.TEAM_MEMBER.value,
            created_by=self.admin,
        )
        self.today = timezone.localdate()

    def create_task(self, *, status, priority=TaskPriority.MEDIUM, due_offset=0, revised_offset=None, assigned_by=None):
        task = Task.objects.create(
            project_name="Dashboard Project",
            task_name=f"{status}-{due_offset}-{revised_offset}",
            description="Dashboard metric test task",
            assigned_by=assigned_by or self.admin,
            status=status,
            priority=priority,
            due_date=self.today + datetime.timedelta(days=due_offset),
            revised_due_date=(
                self.today + datetime.timedelta(days=revised_offset)
                if revised_offset is not None
                else None
            ),
        )
        task.assignees.add(self.member)
        return task

    def test_dashboard_metrics_match_effective_task_data(self):
        self.create_task(status=TaskStatus.COMPLETED, due_offset=-5)
        self.create_task(status=TaskStatus.HOLD, due_offset=-5)
        self.create_task(status=TaskStatus.PENDING, due_offset=5, revised_offset=-1)
        self.create_task(status=TaskStatus.IN_PROGRESS, due_offset=-5, revised_offset=2)
        self.create_task(status=TaskStatus.IN_REVIEW, priority=TaskPriority.HIGH, due_offset=-1)
        self.create_task(status=TaskStatus.PENDING, due_offset=-5, assigned_by=self.other_admin)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/dashboard/stats/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["metrics"]["totalActive"], 3)
        self.assertEqual(data["metrics"]["overdue"], 2)
        self.assertEqual(data["metrics"]["completed"], 1)
        self.assertEqual(data["metrics"]["progress"], 25)

        status_counts = {
            item["originalStatus"]: item["value"] for item in data["statusData"]
        }
        self.assertEqual(status_counts[TaskStatus.PENDING], 1)
        self.assertEqual(status_counts[TaskStatus.IN_PROGRESS], 1)
        self.assertEqual(status_counts[TaskStatus.IN_REVIEW], 1)
        self.assertEqual(status_counts[TaskStatus.HOLD], 1)
        self.assertEqual(status_counts[TaskStatus.COMPLETED], 1)

        workload = {item["name"]: item["tasks"] for item in data["workloadData"]}
        self.assertEqual(workload[self.member.username], 3)
        self.assertTrue(
            all(
                task["status"] not in [TaskStatus.COMPLETED, TaskStatus.HOLD]
                for task in data["topCriticalTasks"]
            )
        )

    def test_dashboard_cache_refreshes_after_task_changes(self):
        self.client.force_authenticate(user=self.admin)
        first_response = self.client.get("/api/dashboard/stats/")
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(first_response.data["data"]["metrics"]["totalActive"], 0)

        with self.captureOnCommitCallbacks(execute=True):
            self.create_task(status=TaskStatus.PENDING, due_offset=1)
        second_response = self.client.get("/api/dashboard/stats/")

        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.data["data"]["metrics"]["totalActive"], 1)

import datetime
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import Task, Timesheet, TaskStatus, TaskPriority, EmployeeScorecard, ScorecardStatus, Notification, Announcement
from core.roles import UserRole

User = get_user_model()


class ScorecardTestCase(APITestCase):

    def setUp(self):
        # Create Superadmin
        self.superadmin = User.objects.create_user(
            username="test_superadmin",
            email="superadmin@test.com",
            password="password123",
            role=UserRole.SUPER_ADMIN.value,
        )

        # Create Admin/TL
        self.admin = User.objects.create_user(
            username="test_admin",
            email="admin@test.com",
            password="password123",
            role=UserRole.ADMIN.value,
        )

        # Create Team Member
        self.member = User.objects.create_user(
            username="test_member",
            email="member@test.com",
            password="password123",
            role=UserRole.TEAM_MEMBER.value,
            created_by=self.admin,
        )

        # Create Month Date
        self.month_start = datetime.date.today().replace(day=1)
        self.month_str = self.month_start.strftime("%Y-%m-%d")

        # Create a Task due this month
        self.task = Task.objects.create(
            project_name="Test Project",
            task_name="Test Task",
            description="Task details",
            assigned_by=self.admin,
            status=TaskStatus.COMPLETED,
            priority=TaskPriority.HIGH,
            due_date=self.month_start + datetime.timedelta(days=10),
        )
        self.task.assignees.add(self.member)
        # Bypassing auto_now by using update() to set a specific completion date (on-time)
        Task.objects.filter(id=self.task.id).update(
            updated_at=timezone.make_aware(
                datetime.datetime(self.month_start.year, self.month_start.month, 5, 12, 0)
            )
        )
        self.task.refresh_from_db()


        # Create a Timesheet log
        self.timesheet = Timesheet.objects.create(
            team_member=self.member,
            task=self.task,
            description="Logged 40 hours",
            status=TaskStatus.COMPLETED,
            start_time=timezone.now() - datetime.timedelta(hours=40),
            end_time=timezone.now(),
        )
        self.timesheet.save()

    def test_admin_view_uncreated_scorecard(self):
        # Admin requests scorecards
        self.client.force_authenticate(user=self.admin)
        url = f"/api/scorecards/?month={self.month_str}"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        scorecards = response.data["data"]["scorecards"]
        self.assertEqual(len(scorecards), 1)
        self.assertEqual(scorecards[0]["status"], "NOT_CREATED")
        # Task completion = 100%, working hours = 40.0
        self.assertEqual(scorecards[0]["task_completion_rate"], 100.0)
        self.assertEqual(scorecards[0]["working_hours"], 40.0)

    def test_save_and_submit_scorecard_by_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = "/api/scorecards/save/"

        # 1. Save as Draft
        payload = {
            "employee": self.member.id,
            "month": self.month_str,
            "quality_score": 4.5,
            "attendance_score": 4.0,
            "admin_comments": "Good performance",
            "status": ScorecardStatus.DRAFT.value,
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], ScorecardStatus.DRAFT.value)

        # Verify scorecard exists in DB and overall score is calculated
        scorecard = EmployeeScorecard.objects.get(employee=self.member, month=self.month_start)
        self.assertEqual(scorecard.quality_score, 4.5)
        # Task Completion: 100% * 0.40 = 40.0
        # Hours compliance: min(100.0, 40 / 160 * 100) = 25% * 0.30 = 7.5
        # Quality: (4.5 / 5) * 100 = 90% * 0.20 = 18.0
        # Attendance: (4.0 / 5) * 100 = 80% * 0.10 = 8.0
        # Expected overall = 40 + 7.5 + 18 + 8 = 73.5
        self.assertAlmostEqual(scorecard.overall_score, 73.5, places=1)

        # 2. Submit for Review
        payload["status"] = ScorecardStatus.SUBMITTED.value
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], ScorecardStatus.SUBMITTED.value)

    def test_superadmin_review_lifecycle(self):
        # Create scorecard in SUBMITTED state
        scorecard = EmployeeScorecard.objects.create(
            employee=self.member,
            month=self.month_start,
            task_completion_rate=100.0,
            working_hours=40.0,
            quality_score=4.5,
            attendance_score=4.0,
            status=ScorecardStatus.SUBMITTED.value,
        )

        self.client.force_authenticate(user=self.superadmin)
        url = f"/api/scorecards/{scorecard.id}/review/"

        # Approve scorecard
        response = self.client.post(url, {"status": ScorecardStatus.APPROVED.value, "superadmin_comments": "Approved"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        scorecard.refresh_from_db()
        self.assertEqual(scorecard.status, ScorecardStatus.APPROVED.value)

        # Publish scorecard
        response = self.client.post(url, {"status": ScorecardStatus.PUBLISHED.value})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        scorecard.refresh_from_db()
        self.assertEqual(scorecard.status, ScorecardStatus.PUBLISHED.value)

    def test_team_member_view_published_only(self):
        # Create scorecard in SUBMITTED state (not published)
        scorecard = EmployeeScorecard.objects.create(
            employee=self.member,
            month=self.month_start,
            task_completion_rate=100.0,
            working_hours=40.0,
            quality_score=4.5,
            attendance_score=4.0,
            status=ScorecardStatus.SUBMITTED.value,
        )

        self.client.force_authenticate(user=self.member)
        url = f"/api/scorecards/?month={self.month_str}"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["data"]["scorecard"])

        # Change status to PUBLISHED
        scorecard.status = ScorecardStatus.PUBLISHED.value
        scorecard.save()

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data["data"]["scorecard"])
        self.assertEqual(response.data["data"]["scorecard"]["overall_score"], scorecard.overall_score)


class TaskNotificationAndPermissionTestCase(APITestCase):

    def setUp(self):
        # Create Superadmin
        self.superadmin = User.objects.create_user(
            username="super_admin_user",
            email="superadmin_user@test.com",
            password="SecurePassword123!",
            role=UserRole.SUPER_ADMIN.value,
        )

        # Create Admins
        self.admin_1 = User.objects.create_user(
            username="admin_user_1",
            email="admin1@test.com",
            password="SecurePassword123!",
            role=UserRole.ADMIN.value,
        )
        self.admin_2 = User.objects.create_user(
            username="admin_user_2",
            email="admin2@test.com",
            password="SecurePassword123!",
            role=UserRole.ADMIN.value,
        )

        # Create Team Members
        self.member_1 = User.objects.create_user(
            username="member_1",
            email="member1@test.com",
            password="SecurePassword123!",
            role=UserRole.TEAM_MEMBER.value,
            created_by=self.admin_1,
        )
        self.member_2 = User.objects.create_user(
            username="member_2",
            email="member2@test.com",
            password="SecurePassword123!",
            role=UserRole.TEAM_MEMBER.value,
            created_by=self.admin_1,
        )

        # Create Task created by member_1
        self.task = Task.objects.create(
            project_name="Project A",
            task_name="Task A",
            description="Detail",
            assigned_by=self.member_1,
            due_date=timezone.now().date(),
        )
        self.task.assignees.set([self.member_1, self.member_2])

    def test_admin_owner_access_to_member_task(self):
        # admin_1 should have access to task created by member_1
        self.client.force_authenticate(user=self.admin_1)
        url = f"/api/tasks/{self.task.id}/detail/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # admin_2 should NOT have access to task created by member_1
        self.client.force_authenticate(user=self.admin_2)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_comment_notification_recipients(self):
        # member_2 comments on task
        self.client.force_authenticate(user=self.member_2)
        url = f"/api/tasks/{self.task.id}/comments/"
        payload = {"content": "Hello World"}
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify notifications:
        # - member_1 should get a notification (assignee + creator)
        # - admin_1 should get a notification (manager of member_1 & member_2)
        # - member_2 should NOT get a notification (commenter)
        self.assertTrue(Notification.objects.filter(recipient=self.member_1, task=self.task).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.admin_1, task=self.task).exists())
        self.assertFalse(Notification.objects.filter(recipient=self.member_2, task=self.task).exists())

    def test_non_destructive_notification_deletion(self):
        # Create an announcement notification for self.member_1
        ann = Announcement.objects.create(
            sender=self.superadmin,
            title="Important Announcement",
            message="Read this",
        )
        ann_notif = Notification.objects.create(
            recipient=self.member_1,
            sender=self.superadmin,
            announcement=ann,
            message="Announcement details",
        )

        # Now, member_2 comments on task, which triggers notification deletion for older comments
        # but should preserve announcement notifications!
        self.client.force_authenticate(user=self.member_2)
        url = f"/api/tasks/{self.task.id}/comments/"
        self.client.post(url, {"content": "New comment"})

        # Verify that ann_notif still exists!
        self.assertTrue(Notification.objects.filter(id=ann_notif.id).exists())

    def test_timesheet_start_end_time_validation(self):
        self.client.force_authenticate(user=self.member_1)
        url = "/api/timesheets/create/"
        
        # Payload with invalid end_time <= start_time
        now = timezone.now()
        payload = {
            "task_id": self.task.id,
            "description": "Attempting invalid log",
            "status": "COMPLETED",
            "start_time": now.isoformat(),
            "end_time": (now - datetime.timedelta(hours=2)).isoformat(),
        }
        
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_time", response.data["errors"])

from django.db import models
from django.contrib.auth.models import AbstractUser
from .roles import UserRole
from django.contrib.auth import get_user_model


class User_model(AbstractUser):
    user_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=100)
    phone_number = models.BigIntegerField(
        unique=True,
        blank=True,
        null=True,
    )
    role = models.CharField(
        max_length=30, choices=UserRole.choices(), default=UserRole.TEAM_MEMBER.value
    )
    created_by = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True
    )
    name = models.CharField(max_length=150, blank=True, null=True)
    employee_id = models.CharField(max_length=50, blank=True, null=True)
    profile_picture = models.TextField(blank=True, null=True)
    can_crud_tasks = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
        ]

    def __str__(self) -> str:
        return self.user_name


User = get_user_model()


class TaskStatus(models.TextChoices):
    PENDING = "PENDING", "To-do"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    HOLD = "HOLD", "Hold"
    IN_REVIEW = "IN_REVIEW", "In Review"
    COMPLETED = "COMPLETED", "Completed"


class TaskPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"


class Task(models.Model):

    project_name = models.CharField(max_length=255)
    task_name = models.CharField(max_length=255)
    description = models.TextField()
    assignees = models.ManyToManyField(
        User,
        related_name="assigned_tasks",
        blank=True,
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_tasks",
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING,
    )
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
    )
    due_date = models.DateField()
    revised_due_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.task_name


class Timesheet(models.Model):
    
    team_member = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="timesheets",
    )
    task = models.ForeignKey(
        "Task",
        on_delete=models.CASCADE,
        related_name="timesheets",
    )
    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING,
    )

    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    working_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )

    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]

    def save(self, *args, **kwargs):
        self.priority = self.task.priority
        if self.start_time and self.end_time:
            total_seconds = (self.end_time - self.start_time).total_seconds()
            self.working_hours = round(total_seconds / 3600, 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.team_member.username} - {self.task.task_name}"


class TaskComment(models.Model):
    """Activity/comment on a task — both admins and assigned team members can post."""
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="task_comments",
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user.username} on {self.task.task_name}"


class SubTask(models.Model):
    """Lightweight checklist-style subtask."""
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="subtasks",
    )
    title = models.CharField(max_length=300)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return self.title




class Notification(models.Model):
    """In-app notification triggered by task activity (comments)."""
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_notifications",
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    announcement = models.ForeignKey(
        "Announcement",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    comment = models.ForeignKey(
        TaskComment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.message[:50]}"


class AnnouncementAudience(models.TextChoices):
    ADMINS_ONLY = "ADMINS_ONLY", "Admins Only"
    ALL = "ALL", "All Users"
    MY_TEAM = "MY_TEAM", "My Team"


class Announcement(models.Model):
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_announcements",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    audience = models.CharField(
        max_length=20,
        choices=AnnouncementAudience.choices,
        default=AnnouncementAudience.ALL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} by {self.sender.username}"

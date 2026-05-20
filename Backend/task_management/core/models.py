from django.db import models
from django.contrib.auth.models import AbstractUser
from .roles import UserRole
from django.contrib.auth import get_user_model


class User_model(AbstractUser):
    user_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=100)
    phone_number = models.IntegerField(
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
    PENDING = "PENDING", "Pending"
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
    assignee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="assigned_tasks",
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

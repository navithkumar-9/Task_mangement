from django.db import models
from django.contrib.auth.models import AbstractUser
from .roles import UserRole


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

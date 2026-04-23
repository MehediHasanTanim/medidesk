import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class ChamberModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "chambers"

    def __str__(self) -> str:
        return self.name


class UserModel(AbstractUser):
    ROLE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("admin", "Admin"),
        ("doctor", "Doctor"),
        ("assistant_doctor", "Assistant Doctor"),
        ("receptionist", "Receptionist"),
        ("assistant", "Assistant"),
        ("trainee", "Trainee"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default="receptionist", db_index=True)
    chambers = models.ManyToManyField(ChamberModel, blank=True, related_name="staff")
    supervisor = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assistant_doctors",
        limit_choices_to={"role": "doctor"},
    )

    class Meta:
        app_label = "infrastructure"
        db_table = "users"

    def __str__(self) -> str:
        return f"{self.full_name} ({self.role})"

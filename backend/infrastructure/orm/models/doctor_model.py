import uuid

from django.conf import settings
from django.db import models


class SpecialityModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "specialities"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class DoctorProfileModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="doctor_profile",
    )
    speciality = models.ForeignKey(
        SpecialityModel,
        on_delete=models.PROTECT,
        related_name="doctors",
    )
    qualifications = models.CharField(
        max_length=500,
        help_text="e.g. MBBS, MD (Cardiology), FCPS",
    )
    bio = models.TextField(blank=True)
    consultation_fee = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    experience_years = models.PositiveIntegerField(null=True, blank=True)
    is_available = models.BooleanField(default=True, db_index=True)
    visit_days = models.JSONField(
        default=list,
        blank=True,
        help_text='e.g. ["Sat", "Sun", "Mon"]',
    )
    visit_time_start = models.TimeField(null=True, blank=True)
    visit_time_end = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "doctor_profiles"
        indexes = [
            models.Index(fields=["speciality", "is_available"]),
        ]

    def __str__(self) -> str:
        return f"Dr. {self.user.full_name} — {self.speciality.name}"

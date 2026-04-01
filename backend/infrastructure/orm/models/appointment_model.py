import uuid

from django.conf import settings
from django.db import models


class AppointmentModel(models.Model):
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("confirmed", "Confirmed"),
        ("in_queue", "In Queue"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("no_show", "No Show"),
    ]
    TYPE_CHOICES = [
        ("new", "New"),
        ("follow_up", "Follow Up"),
        ("walk_in", "Walk In"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        "infrastructure.PatientModel", on_delete=models.PROTECT, related_name="appointments", db_index=True
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="appointments", db_index=True
    )
    chamber = models.ForeignKey(
        "infrastructure.ChamberModel", on_delete=models.SET_NULL, null=True, blank=True
    )
    scheduled_at = models.DateTimeField(db_index=True)
    appointment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled", db_index=True)
    token_number = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_appointments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "appointments"
        indexes = [
            models.Index(fields=["scheduled_at", "status"]),
            models.Index(fields=["patient", "scheduled_at"]),
            models.Index(fields=["doctor", "scheduled_at"]),
            models.Index(fields=["chamber", "scheduled_at"]),
        ]

    def __str__(self) -> str:
        return f"Appt#{self.token_number} {self.patient} @ {self.scheduled_at:%Y-%m-%d %H:%M}"

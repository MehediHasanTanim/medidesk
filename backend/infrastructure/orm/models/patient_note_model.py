import uuid

from django.conf import settings
from django.db import models


class PatientNoteModel(models.Model):
    """
    Free-form staff note attached to a patient — not tied to any consultation.
    Used for administrative observations, reception notes, or clinical reminders
    that don't belong inside a formal consultation record.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        "infrastructure.PatientModel",
        on_delete=models.CASCADE,
        related_name="patient_notes",
        db_index=True,
    )
    content = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_notes_authored",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "patient_notes"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Note for patient {self.patient_id} by {self.created_by_id} at {self.created_at}"

import uuid

from django.conf import settings
from django.db import models


class ConsultationModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField(
        "infrastructure.AppointmentModel", on_delete=models.PROTECT, related_name="consultation"
    )
    patient = models.ForeignKey(
        "infrastructure.PatientModel", on_delete=models.PROTECT, related_name="consultations", db_index=True
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="consultations"
    )
    chief_complaints = models.TextField()
    clinical_findings = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    # Vitals (denormalised for query efficiency)
    bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    pulse = models.PositiveSmallIntegerField(null=True, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    spo2 = models.PositiveSmallIntegerField(null=True, blank=True)
    is_draft = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "consultations"
        indexes = [
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["diagnosis"]),
        ]

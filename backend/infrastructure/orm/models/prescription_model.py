import uuid

from django.conf import settings
from django.db import models


class PrescriptionModel(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("active", "Active"),
        ("approved", "Approved"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.OneToOneField(
        "infrastructure.ConsultationModel", on_delete=models.PROTECT, related_name="prescription"
    )
    patient = models.ForeignKey(
        "infrastructure.PatientModel", on_delete=models.PROTECT, related_name="prescriptions", db_index=True
    )
    prescribed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="authored_prescriptions"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_prescriptions",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", db_index=True)
    follow_up_date = models.DateField(null=True, blank=True)
    pdf_path = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "prescriptions"


class PrescriptionItemModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(
        PrescriptionModel, on_delete=models.CASCADE, related_name="items"
    )
    medicine = models.ForeignKey(
        "infrastructure.BrandMedicineModel", on_delete=models.PROTECT
    )
    medicine_name = models.CharField(max_length=255)  # snapshot at time of prescribing
    morning = models.CharField(max_length=10)
    afternoon = models.CharField(max_length=10)
    evening = models.CharField(max_length=10)
    duration_days = models.PositiveSmallIntegerField()
    route = models.CharField(max_length=20, default="oral")
    instructions = models.TextField(blank=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "prescription_items"

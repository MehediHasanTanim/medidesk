import uuid

from django.conf import settings
from django.db import models


class TestOrderModel(models.Model):
    APPROVAL_STATUS_CHOICES = [
        ("pending", "Pending Approval"),   # created by assistant_doctor, awaiting doctor review
        ("approved", "Approved"),           # approved by doctor (or directly added by doctor)
        ("rejected", "Rejected"),           # rejected by doctor
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(
        "infrastructure.ConsultationModel", on_delete=models.PROTECT, related_name="test_orders"
    )
    patient = models.ForeignKey(
        "infrastructure.PatientModel", on_delete=models.PROTECT, related_name="test_orders", db_index=True
    )
    test_name = models.CharField(max_length=255)
    lab_name = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")          # clinical reason / instructions
    ordered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="test_orders_placed",
    )
    ordered_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_completed = models.BooleanField(default=False, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    approval_status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default="approved",   # existing rows stay approved; new assistant_doctor orders set to "pending"
        db_index=True,
    )

    class Meta:
        app_label = "infrastructure"
        db_table = "test_orders"
        ordering = ["-ordered_at"]


class ReportDocumentModel(models.Model):
    CATEGORY_CHOICES = [
        ("blood_test", "Blood Test"),
        ("imaging", "Imaging"),
        ("biopsy", "Biopsy"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        "infrastructure.PatientModel", on_delete=models.PROTECT, related_name="reports", db_index=True
    )
    test_order = models.ForeignKey(
        TestOrderModel, on_delete=models.SET_NULL, null=True, blank=True, related_name="reports"
    )
    consultation = models.ForeignKey(
        "infrastructure.ConsultationModel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reports",
    )
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, db_index=True)
    file = models.FileField(upload_to="reports/%Y/%m/%d/")
    original_filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, db_index=True)
    notes = models.TextField(blank=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "report_documents"
        indexes = [
            models.Index(fields=["patient", "uploaded_at"]),
            models.Index(fields=["category"]),
        ]

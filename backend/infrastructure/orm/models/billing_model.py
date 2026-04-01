import uuid

from django.conf import settings
from django.db import models


class InvoiceModel(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("issued", "Issued"),
        ("paid", "Paid"),
        ("partially_paid", "Partially Paid"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=30, unique=True, db_index=True)
    patient = models.ForeignKey(
        "infrastructure.PatientModel", on_delete=models.PROTECT, related_name="invoices", db_index=True
    )
    consultation = models.ForeignKey(
        "infrastructure.ConsultationModel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "invoices"
        indexes = [
            models.Index(fields=["created_at", "status"]),
            models.Index(fields=["patient", "created_at"]),
        ]


class InvoiceItemModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(InvoiceModel, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=255)
    quantity = models.PositiveSmallIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        app_label = "infrastructure"
        db_table = "invoice_items"


class PaymentModel(models.Model):
    METHOD_CHOICES = [
        ("cash", "Cash"),
        ("bkash", "bKash"),
        ("nagad", "Nagad"),
        ("card", "Card"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(InvoiceModel, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    transaction_ref = models.CharField(max_length=100, blank=True)
    paid_at = models.DateTimeField(auto_now_add=True, db_index=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        app_label = "infrastructure"
        db_table = "payments"

import uuid

from django.db import models


class GenericMedicineModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    generic_name = models.CharField(max_length=255, unique=True, db_index=True)
    drug_class = models.CharField(max_length=100, db_index=True)
    contraindications = models.JSONField(default=list)

    class Meta:
        app_label = "infrastructure"
        db_table = "generic_medicines"

    def __str__(self) -> str:
        return self.generic_name


class BrandMedicineModel(models.Model):
    FORM_CHOICES = [
        ("tablet", "Tablet"),
        ("capsule", "Capsule"),
        ("syrup", "Syrup"),
        ("injection", "Injection"),
        ("cream", "Cream"),
        ("drops", "Drops"),
        ("inhaler", "Inhaler"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    generic = models.ForeignKey(GenericMedicineModel, on_delete=models.PROTECT, related_name="brands")
    brand_name = models.CharField(max_length=255, db_index=True)
    manufacturer = models.CharField(max_length=255)
    strength = models.CharField(max_length=50)
    form = models.CharField(max_length=20, choices=FORM_CHOICES)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "brand_medicines"
        indexes = [
            models.Index(fields=["brand_name", "is_active"]),
            models.Index(fields=["generic", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.brand_name} {self.strength} ({self.form})"

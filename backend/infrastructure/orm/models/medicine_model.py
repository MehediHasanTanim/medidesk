import uuid

from django.db import models


class ManufacturerModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True, db_index=True)
    country = models.CharField(max_length=100, blank=True, default="Bangladesh")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "manufacturers"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class GenericMedicineModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    generic_name = models.CharField(max_length=255, unique=True, db_index=True)
    drug_class = models.CharField(max_length=100, db_index=True)
    therapeutic_class = models.CharField(max_length=150, blank=True, default="")

    # Clinical information (long text fields — all optional)
    indications = models.TextField(blank=True, default="")
    dosage_info = models.TextField(blank=True, default="")
    administration = models.TextField(blank=True, default="")
    contraindications = models.JSONField(default=list)
    side_effects = models.TextField(blank=True, default="")
    drug_interactions = models.TextField(blank=True, default="")
    storage = models.TextField(blank=True, default="")
    pregnancy_notes = models.TextField(blank=True, default="")
    precautions = models.TextField(blank=True, default="")
    mode_of_action = models.TextField(blank=True, default="")

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
        ("powder_for_suspension", "Powder for Suspension"),
        ("solution", "Solution"),
        ("gel", "Gel"),
        ("ointment", "Ointment"),
        ("suppository", "Suppository"),
        ("patch", "Patch"),
        ("spray", "Spray"),
        ("lotion", "Lotion"),
        ("powder", "Powder"),
        ("granules", "Granules"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    generic = models.ForeignKey(GenericMedicineModel, on_delete=models.PROTECT, related_name="brands")
    brand_name = models.CharField(max_length=255, db_index=True)
    manufacturer = models.CharField(max_length=255)
    strength = models.CharField(max_length=100)
    form = models.CharField(max_length=30, choices=FORM_CHOICES)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    product_code = models.CharField(max_length=50, blank=True, default="")
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

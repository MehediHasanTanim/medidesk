import uuid

from django.db import models


class PatientModel(models.Model):
    GENDER_CHOICES = [("M", "Male"), ("F", "Female"), ("O", "Other")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_id = models.CharField(max_length=20, unique=True, db_index=True)
    full_name = models.CharField(max_length=255, db_index=True)
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    address = models.TextField()
    date_of_birth = models.DateField(null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    national_id = models.CharField(max_length=20, null=True, blank=True)
    allergies = models.JSONField(default=list)
    chronic_diseases = models.JSONField(default=list)
    family_history = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "patients"
        indexes = [
            models.Index(fields=["full_name"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["patient_id"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.patient_id})"

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("infrastructure", "0011_add_patient_age_years"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PatientNoteModel",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("content", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="patient_notes_authored",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        db_index=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="patient_notes",
                        to="infrastructure.patientmodel",
                    ),
                ),
            ],
            options={
                "db_table": "patient_notes",
                "ordering": ["-created_at"],
                "app_label": "infrastructure",
            },
        ),
    ]

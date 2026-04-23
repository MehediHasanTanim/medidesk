import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("infrastructure", "0013_user_supervisor"),
    ]

    operations = [
        migrations.CreateModel(
            name="DoctorChamberScheduleModel",
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
                (
                    "visit_days",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text='e.g. ["Sat", "Sun", "Mon"]',
                    ),
                ),
                ("visit_time_start", models.TimeField(blank=True, null=True)),
                ("visit_time_end", models.TimeField(blank=True, null=True)),
                (
                    "doctor_profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chamber_schedules",
                        to="infrastructure.doctorprofilemodel",
                    ),
                ),
                (
                    "chamber",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="doctor_schedules",
                        to="infrastructure.chambermodel",
                    ),
                ),
            ],
            options={
                "db_table": "doctor_chamber_schedules",
                "app_label": "infrastructure",
                "unique_together": {("doctor_profile", "chamber")},
            },
        ),
    ]

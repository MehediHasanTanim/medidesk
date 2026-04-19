"""
Migration: extend test_orders with notes, ordered_by, completed_at and add indexes.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("infrastructure", "0008_medicine_clinical_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="testordermodel",
            name="notes",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="testordermodel",
            name="ordered_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="test_orders_placed",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="testordermodel",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        # Add index on ordered_at for fast patient-history queries
        migrations.AddIndex(
            model_name="testordermodel",
            index=models.Index(fields=["ordered_at"], name="test_orders_ordered_at_idx"),
        ),
        migrations.AddIndex(
            model_name="testordermodel",
            index=models.Index(fields=["is_completed"], name="test_orders_completed_idx"),
        ),
        # Set ordering default via AlterModelOptions
        migrations.AlterModelOptions(
            name="testordermodel",
            options={"ordering": ["-ordered_at"]},
        ),
    ]

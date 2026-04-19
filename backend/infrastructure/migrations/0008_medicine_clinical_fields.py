"""
Migration: add clinical fields to generic_medicines and mrp/product_code to brand_medicines.

New fields on generic_medicines:
  therapeutic_class, indications, dosage_info, administration, side_effects,
  drug_interactions, storage, pregnancy_notes, precautions, mode_of_action

New fields on brand_medicines:
  mrp, product_code

Also expands the form field max_length from 20 → 30 to support new choices
(e.g. "powder_for_suspension").
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("infrastructure", "0007_manufacturer"),
    ]

    operations = [
        # ── Generic medicine: new clinical text fields ────────────────────────
        migrations.AddField(
            model_name="genericmedicinemodel",
            name="therapeutic_class",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
        migrations.AddField(
            model_name="genericmedicinemodel",
            name="indications",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="genericmedicinemodel",
            name="dosage_info",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="genericmedicinemodel",
            name="administration",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="genericmedicinemodel",
            name="side_effects",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="genericmedicinemodel",
            name="drug_interactions",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="genericmedicinemodel",
            name="storage",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="genericmedicinemodel",
            name="pregnancy_notes",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="genericmedicinemodel",
            name="precautions",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="genericmedicinemodel",
            name="mode_of_action",
            field=models.TextField(blank=True, default=""),
        ),

        # ── Brand medicine: price + product code ──────────────────────────────
        migrations.AddField(
            model_name="brandmedicinemodel",
            name="mrp",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="brandmedicinemodel",
            name="product_code",
            field=models.CharField(blank=True, default="", max_length=50),
        ),

        # ── Brand medicine: expand form field to hold longer choice keys ──────
        migrations.AlterField(
            model_name="brandmedicinemodel",
            name="form",
            field=models.CharField(
                max_length=30,
                choices=[
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
                ],
            ),
        ),

        # ── Brand medicine: expand strength field to 100 chars ────────────────
        migrations.AlterField(
            model_name="brandmedicinemodel",
            name="strength",
            field=models.CharField(max_length=100),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("infrastructure", "0010_add_trainee_role"),
        ("infrastructure", "0010_test_order_approval_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientmodel",
            name="age_years",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
    ]

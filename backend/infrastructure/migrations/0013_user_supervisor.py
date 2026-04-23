from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("infrastructure", "0012_patient_notes"),
    ]

    operations = [
        migrations.AddField(
            model_name="usermodel",
            name="supervisor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assistant_doctors",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]

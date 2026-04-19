from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("infrastructure", "0009_test_order_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="testordermodel",
            name="approval_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending Approval"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                ],
                db_index=True,
                default="approved",
                max_length=20,
            ),
        ),
    ]

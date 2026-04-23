from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('infrastructure', '0009_test_order_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usermodel',
            name='role',
            field=models.CharField(
                choices=[
                    ('super_admin', 'Super Admin'),
                    ('admin', 'Admin'),
                    ('doctor', 'Doctor'),
                    ('assistant_doctor', 'Assistant Doctor'),
                    ('receptionist', 'Receptionist'),
                    ('assistant', 'Assistant'),
                    ('trainee', 'Trainee'),
                ],
                db_index=True,
                default='receptionist',
                max_length=30,
            ),
        ),
    ]

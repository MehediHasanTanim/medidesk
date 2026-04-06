from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('infrastructure', '0003_add_super_admin_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='chambermodel',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name='chambermodel',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
    ]

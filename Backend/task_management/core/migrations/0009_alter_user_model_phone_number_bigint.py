from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_user_model_employee_id_user_model_name_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user_model',
            name='phone_number',
            field=models.BigIntegerField(blank=True, null=True, unique=True),
        ),
    ]

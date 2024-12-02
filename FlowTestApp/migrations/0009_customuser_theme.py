# Generated manually

from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('FlowTestApp', '0008_remove_customuser_preferred_language_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='theme',
            field=models.CharField(
                choices=[('light', 'Light'), ('dark', 'Dark')],
                default='light',
                max_length=5,
            ),
        ),
    ]

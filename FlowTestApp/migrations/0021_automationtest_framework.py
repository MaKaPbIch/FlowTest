# Generated by Django 5.1 on 2025-01-14 19:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('FlowTestApp', '0020_testcase_author'),
    ]

    operations = [
        migrations.AddField(
            model_name='automationtest',
            name='framework',
            field=models.CharField(choices=[('pytest', 'PyTest'), ('unittest', 'UnitTest'), ('robot', 'Robot Framework'), ('playwright', 'Playwright')], default='pytest', max_length=20),
        ),
    ]

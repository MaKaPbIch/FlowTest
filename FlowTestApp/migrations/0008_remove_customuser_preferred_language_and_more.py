# Generated by Django 5.1 on 2024-11-26 19:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('FlowTestApp', '0007_customuser_avatar'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='customuser',
            name='preferred_language',
        ),
        migrations.AddField(
            model_name='customuser',
            name='language',
            field=models.CharField(choices=[('en', 'English'), ('ru', 'Russian'), ('de', 'German')], default='en', max_length=2),
        ),
    ]

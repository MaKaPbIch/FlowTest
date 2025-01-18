# Generated by Django 5.1 on 2024-12-19 15:46

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('FlowTestApp', '0010_testcase_test_code_testcase_test_type_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='TestReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('passed', 'Passed'), ('failed', 'Failed'), ('blocked', 'Blocked'), ('skipped', 'Skipped'), ('in_progress', 'In Progress')], default='in_progress', max_length=50)),
                ('execution_date', models.DateTimeField(auto_now_add=True)),
                ('execution_time', models.DurationField(blank=True, null=True)),
                ('actual_result', models.TextField(blank=True, null=True)),
                ('comments', models.TextField(blank=True, null=True)),
                ('attachments', models.FileField(blank=True, null=True, upload_to='test_reports/')),
                ('environment', models.CharField(blank=True, max_length=255, null=True)),
                ('version', models.CharField(blank=True, max_length=50, null=True)),
                ('executor', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='executed_reports', to=settings.AUTH_USER_MODEL)),
                ('test_case', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='FlowTestApp.testcase')),
            ],
            options={
                'ordering': ['-execution_date'],
            },
        ),
    ]

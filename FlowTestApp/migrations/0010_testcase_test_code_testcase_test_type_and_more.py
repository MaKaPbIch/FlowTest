# Generated by Django 5.1 on 2024-12-01 09:41

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('FlowTestApp', '0009_customuser_theme'),
    ]

    operations = [
        migrations.AddField(
            model_name='testcase',
            name='test_code',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='testcase',
            name='test_type',
            field=models.CharField(choices=[('manual', 'Manual'), ('automated', 'Automated')], default='manual', max_length=50),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='role',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='users', to='FlowTestApp.role'),
        ),
    ]

from django.db import models
from rest_framework.views import APIView
from django.contrib.auth.models import AbstractUser, Permission
from django.conf import settings
from django.utils import timezone
from urllib.parse import urlparse
from django.core.exceptions import ValidationError
from asgiref.sync import sync_to_async
from django.db.models.signals import post_save
from django.dispatch import receiver
import threading
from playwright.sync_api import sync_playwright
import logging

logger = logging.getLogger(__name__)

# Create your models here.
class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=50, choices=[('active', 'Active'), ('archived', 'Archived')], blank=True, null=True, default='active')
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='projects', blank=True)

    def __str__(self):
        return self.name

class Folder(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    project = models.ForeignKey(Project, related_name='folders', on_delete=models.CASCADE)
    parent_folder = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subfolders'
    )
    status = models.CharField(max_length=50, default='active', blank=True, null=True)

    def __str__(self):
        return self.name


class TestCase(models.Model):
    folder = models.ForeignKey(Folder, related_name='test_cases', on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=255, default="Unnamed Test Case")
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    condition = models.TextField(blank=True, null=True)
    steps = models.TextField(blank=True, null=True)
    expected_results = models.TextField(blank=True, null=True)
    priority = models.CharField(
        max_length=50,
        choices=[
            ('high', 'High'),
            ('medium', 'Medium'),
            ('low', 'Low')
        ],
        default='medium'
    )
    platform = models.CharField(max_length=50, default="Any")
    test_type = models.CharField(max_length=50, choices=[('manual', 'Manual'), ('automated', 'Automated')], default='manual')
    test_code = models.TextField(blank=True, null=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='authored_tests')
    # Поля для автоматизированных тестов
    script_path = models.CharField(max_length=255, blank=True, null=True)
    framework = models.CharField(
        max_length=50,
        choices=[
            ('pytest', 'PyTest'),
            ('unittest', 'UnitTest'),
            ('robot', 'Robot Framework'),
            ('cypress', 'Cypress'),
            ('selenium', 'Selenium'),
            ('playwright', 'Playwright'),
            ('other', 'Other')
        ],
        default='pytest',
        blank=True,
        null=True
    )
    automation_project = models.ForeignKey('AutomationProject', on_delete=models.SET_NULL, null=True, blank=True, related_name='test_cases')

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['title']

class TestRun(models.Model):
    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, null=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('error', 'Error')
    ], default='pending')
    started_at = models.DateTimeField(null=True)
    finished_at = models.DateTimeField(null=True)
    duration = models.FloatField(null=True, help_text='Duration in seconds')
    error_message = models.TextField(null=True, blank=True)
    log_output = models.TextField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.started_at and self.finished_at and not self.duration:
            self.duration = (self.finished_at - self.started_at).total_seconds()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Test Run {self.id} - {self.test_case.title if self.test_case else 'No test case'} ({self.status})"

class Role(models.Model):
    name = models.CharField(max_length=255, unique=True)
    permissions = models.ManyToManyField(Permission, related_name='roles', blank=True)

    def __str__(self):
        return self.name

class CustomUser(AbstractUser):
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ru', 'Russian'),
        ('de', 'German'),
    ]
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
    ]

    middle_name = models.CharField(max_length=150, blank=True, null=True, verbose_name="Отчество", default="")
    first_name = models.CharField(max_length=150, blank=False, verbose_name="Имя", default="Имя")
    last_name = models.CharField(max_length=150, blank=False, verbose_name="Фамилия", default="Фамилия")
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES, default='en')
    phone_number = models.CharField(max_length=15, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    theme = models.CharField(max_length=5, choices=THEME_CHOICES, default='light')
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')

    def save(self, *args, **kwargs):
        # Save user first to ensure `id` is generated
        super().save(*args, **kwargs)
        # Automatically assign permissions from role if a role is assigned
        if self.role:
            self.user_permissions.set(self.role.permissions.all())

    def __str__(self):
        return f"{self.last_name} {self.first_name} {self.middle_name or ''}".strip()


class SchedulerEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('run_tests', 'Run Tests'),
        ('general', 'General Event'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES, default='general')
    scheduled_time = models.DateTimeField()
    recurrence = models.CharField(
        max_length=50,
        choices=[('none', 'None'), ('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly')],
        default='none'
    )
    project = models.ForeignKey(Project, related_name='events', on_delete=models.CASCADE)
    parent_event = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='child_events'
    )
    test_config = models.JSONField(
        null=True,
        blank=True,
        help_text='Configuration for test execution: {"run_all_project_tests": true} or {"folder_id": 123} or {"test_cases": [1, 2, 3]}'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_run = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending'),
            ('running', 'Running'),
            ('completed', 'Completed'),
            ('failed', 'Failed')
        ],
        default='pending'
    )

    def __str__(self):
        return self.title

    def clean(self):
        if self.event_type == 'run_tests' and not self.test_config:
            raise ValidationError({
                'test_config': 'Test configuration is required for test execution events'
            })

class TestReport(models.Model):
    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, related_name='reports')
    executor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='executed_reports')
    status = models.CharField(
        max_length=50,
        choices=[
            ('passed', 'Passed'),
            ('failed', 'Failed'),
            ('blocked', 'Blocked'),
            ('skipped', 'Skipped'),
            ('in_progress', 'In Progress')
        ],
        default='in_progress'
    )
    execution_date = models.DateTimeField(auto_now_add=True)
    execution_time = models.DurationField(null=True, blank=True)
    actual_result = models.TextField(blank=True, null=True)
    comments = models.TextField(blank=True, null=True)
    attachments = models.FileField(upload_to='test_reports/', null=True, blank=True)
    environment = models.CharField(max_length=255, blank=True, null=True)
    version = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"Report for {self.test_case.title} - {self.status} ({self.execution_date})"

    class Meta:
        ordering = ['-execution_date']

class TestEvent(models.Model):
    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, related_name='events')
    test_report = models.ForeignKey(TestReport, on_delete=models.CASCADE, related_name='events', null=True, blank=True)
    event_type = models.CharField(
        max_length=50,
        choices=[
            ('start', 'Test Started'),
            ('step_complete', 'Step Completed'),
            ('error', 'Error Occurred'),
            ('warning', 'Warning'),
            ('info', 'Information'),
            ('finish', 'Test Finished')
        ]
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.TextField()
    details = models.JSONField(null=True, blank=True)  # Для хранения дополнительной информации в формате JSON
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_events')
    severity = models.CharField(
        max_length=20,
        choices=[
            ('critical', 'Critical'),
            ('high', 'High'),
            ('medium', 'Medium'),
            ('low', 'Low'),
            ('info', 'Info')
        ],
        default='info'
    )
    screenshot = models.ImageField(upload_to='test_events/screenshots/', null=True, blank=True)
    log_file = models.FileField(upload_to='test_events/logs/', null=True, blank=True)

    def __str__(self):
        return f"{self.event_type} - {self.timestamp} - {self.test_case.title}"

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['event_type']),
            models.Index(fields=['severity'])
        ]

class AutomationProject(models.Model):
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='automation_projects', null=True, blank=True)
    repository_url = models.URLField()
    repository_type = models.CharField(max_length=20, choices=[
        ('github', 'GitHub'),
        ('gitlab', 'GitLab'),
        ('bitbucket', 'Bitbucket')
    ], default='github')
    branch = models.CharField(max_length=100, default='main')
    framework = models.CharField(max_length=20, choices=[
        ('pytest', 'PyTest'),
        ('unittest', 'UnitTest'),
        ('robot', 'Robot Framework'),
        ('playwright', 'Playwright')
    ])
    tests_directory = models.CharField(max_length=255, default='tests/')
    local_path = models.CharField(max_length=255, null=True, blank=True)
    access_token = models.CharField(max_length=255, null=True, blank=True, help_text='Personal access token for private repositories')
    username = models.CharField(max_length=100, null=True, blank=True, help_text='Username for private repositories')
    last_sync = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    sync_status = models.CharField(max_length=20, default='not_synced', choices=[
        ('synced', 'Synced'),
        ('not_synced', 'Not Synced'),
        ('error', 'Error')
    ])

    def __str__(self):
        return f"{self.name} ({self.project.name})"

    def get_repository_url_with_auth(self):
        """Возвращает URL репозитория с учетом аутентификации"""
        if not self.access_token:
            return self.repository_url

        parsed_url = urlparse(self.repository_url)
        if self.repository_type == 'github':
            return f"https://{self.access_token}@{parsed_url.netloc}{parsed_url.path}"
        elif self.repository_type == 'gitlab':
            return f"https://oauth2:{self.access_token}@{parsed_url.netloc}{parsed_url.path}"
        elif self.repository_type == 'bitbucket':
            if self.username:
                return f"https://{self.username}:{self.access_token}@{parsed_url.netloc}{parsed_url.path}"
        return self.repository_url

class AutomationTest(models.Model):
    project = models.ForeignKey(AutomationProject, on_delete=models.CASCADE, related_name='tests')
    name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=255)
    is_available = models.BooleanField(default=True)
    last_run = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=50, null=True, blank=True)
    framework = models.CharField(
        max_length=20,
        choices=[
            ('pytest', 'PyTest'),
            ('unittest', 'UnitTest'),
            ('robot', 'Robot Framework'),
            ('playwright', 'Playwright')
        ],
        default='pytest'
    )

    def __str__(self):
        return f"{self.project.name} - {self.name}"

class TestSchedule(models.Model):
    project = models.ForeignKey(AutomationProject, on_delete=models.CASCADE, related_name='schedules')
    tests = models.ManyToManyField(AutomationTest, blank=True)
    schedule_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    last_run = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=20, choices=[
        ('success', 'Success'),
        ('error', 'Error'),
        ('pending', 'Pending')
    ], default='pending')
    last_result = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Schedule for {self.project.name} at {self.schedule_time}"
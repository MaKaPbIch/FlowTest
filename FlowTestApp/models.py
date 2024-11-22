from django.db import models
from rest_framework.views import APIView
from django.contrib.auth.models import AbstractUser, Permission
from django.conf import settings


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
    priority = models.CharField(max_length=50, default="Medium")
    platform = models.CharField(max_length=50, default="Any")

    def __str__(self):
        return self.title

class TestRun(models.Model):
    test_case = models.ForeignKey(TestCase, on_delete=models.SET_NULL, null=True, blank=True, related_name="test_runs")
    status = models.CharField(
        max_length=50,
        choices=[('passed', 'Passed'), ('failed', 'Failed'), ('skipped', 'Skipped')],
        default='skipped'
    )
    run_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.test_case.title if self.test_case else 'Deleted Test Case'} - {self.status}"

    @staticmethod
    def create_dummy_run(test_case):
        return TestRun.objects.create(test_case=test_case, status='skipped')
    
class AutomationScript(models.Model):
    test_case = models.OneToOneField(TestCase, on_delete=models.SET_NULL, null=True, blank=True)
    script_path = models.CharField(max_length=255)
    repository_url = models.URLField()
    branch = models.CharField(max_length=50, default='main')

    def __str__(self):
        return f"Script for {self.test_case.title if self.test_case else 'Deleted Test Case'}"

    @staticmethod
    def create_dummy_script(test_case):
        return AutomationScript.objects.create(
            test_case=test_case,
            script_path='/dummy/path/to/script',
            repository_url='https://github.com/dummy-repo.git',
            branch='main'
        )

class Role(models.Model):
    name = models.CharField(max_length=255, unique=True)
    permissions = models.ManyToManyField(Permission, related_name='roles', blank=True)

    def __str__(self):
        return self.name

class CustomUser(AbstractUser):
    phone_number = models.CharField(max_length=15, blank=True)
    middle_name = models.CharField(max_length=150, blank=True, null=True, verbose_name="Отчество", default="")
    first_name = models.CharField(max_length=150, blank=False, verbose_name="Имя", default="Имя")
    last_name = models.CharField(max_length=150, blank=False, verbose_name="Фамилия", default="Фамилия")
    role = models.ForeignKey(Role, on_delete=models.PROTECT, null=True, blank=True, related_name='users')

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
        ('run', 'Run Test'),
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        from django.core.exceptions import ValidationError
        overlapping_events = SchedulerEvent.objects.filter(
            project=self.project,
            scheduled_time=self.scheduled_time
        ).exclude(pk=self.pk)
        if overlapping_events.exists():
            raise ValidationError('An event is already scheduled at this time for this project.')

    def __str__(self):
        return f"{self.title} ({self.event_type}) at {self.scheduled_time}"
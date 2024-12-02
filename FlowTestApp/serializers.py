from rest_framework import serializers
from .models import Folder, TestCase, TestRun, AutomationScript, Project, SchedulerEvent, CustomUser, Role
from django.contrib.auth.models import User

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = '__all__'


class TestCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCase
        fields = '__all__'


class TestRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestRun
        fields = '__all__'


class AutomationScriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationScript
        fields = '__all__'


class SchedulerEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchedulerEvent
        fields = '__all__'

    def validate(self, data):
        project = data.get('project')
        scheduled_time = data.get('scheduled_time')
        overlapping_events = SchedulerEvent.objects.filter(
            project=project,
            scheduled_time=scheduled_time
        )
        if self.instance:
            overlapping_events = overlapping_events.exclude(pk=self.instance.pk)
        if overlapping_events.exists():
            raise serializers.ValidationError('An event is already scheduled at this time for this project.')
        return data

    def validate(self, data):
        project = data.get('project')
        scheduled_time = data.get('scheduled_time')
        overlapping_events = SchedulerEvent.objects.filter(
            project=project,
            scheduled_time=scheduled_time
        )
        if self.instance:
            overlapping_events = overlapping_events.exclude(pk=self.instance.pk)
        if overlapping_events.exists():
            raise serializers.ValidationError('An event is already scheduled at this time for this project.')
        return data

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'permissions']

class CustomUserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), source='role', write_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'phone_number', 'first_name', 'last_name', 'middle_name', 'role', 'role_id', 'avatar', 'theme']

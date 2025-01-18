from rest_framework import serializers
from .models import Project, Folder, TestCase, TestRun, SchedulerEvent, CustomUser, Role, AutomationProject, AutomationTest, TestSchedule


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


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'permissions']


class CustomUserSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False)
    
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'avatar')


class AutomationProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationProject
        fields = ['id', 'project', 'name', 'repository_url', 'repository_type',
                 'branch', 'framework', 'tests_directory', 'access_token', 
                 'username', 'last_sync', 'sync_status']
        read_only_fields = ['last_sync', 'sync_status']
        extra_kwargs = {
            'access_token': {'write_only': True},  # Токен не будет возвращаться в ответах API
            'username': {'write_only': True},  # Имя пользователя тоже скрываем
            'project': {'required': False}  # Делаем поле project необязательным
        }


class AutomationTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationTest
        fields = ['id', 'name', 'file_path', 'is_available', 'last_run', 'last_status']


class TestScheduleSerializer(serializers.ModelSerializer):
    tests = AutomationTestSerializer(many=True, read_only=True)

    class Meta:
        model = TestSchedule
        fields = ['id', 'project', 'schedule_time', 'tests', 'created_at']

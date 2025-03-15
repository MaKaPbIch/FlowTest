from rest_framework import serializers
from .models import Project, Folder, TestCase, TestRun, SchedulerEvent, CustomUser, Role, Permission, AutomationProject, AutomationTest, TestSchedule, ReportTemplate, CustomChart


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
        extra_kwargs = {
            'tags': {'required': False},
            'steps': {'required': False}
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if representation['tags'] is None:
            representation['tags'] = []
        if representation['steps'] is None:
            representation['steps'] = []
        return representation


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


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'description', 'category']

class RoleSerializer(serializers.ModelSerializer):
    permissions_details = PermissionSerializer(source='permissions', many=True, read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'permissions_details', 'is_admin_role']


class CustomUserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'middle_name', 'language', 'phone_number', 'avatar_url', 'theme', 'role', 'is_active']
        read_only_fields = ['id', 'avatar_url']
        extra_kwargs = {
            'username': {'required': True}
        }
        
    def get_avatar_url(self, obj):
        if obj.avatar and obj.avatar.name:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None
        
    def create(self, validated_data):
        """
        Override create method to handle password hashing
        """
        # First, check if a user with this username already exists
        username = validated_data.get('username')
        if username and CustomUser.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": f"Пользователь с именем '{username}' уже существует. Пожалуйста, выберите другое имя пользователя."})
            
        # Handle password correctly
        password = validated_data.pop('password', None)
        user = CustomUser(**validated_data)
        if password:
            user.set_password(password)
        
        try:
            user.save()
        except Exception as e:
            print(f"Error saving user: {str(e)}")
            # Custom error handling for database constraints
            if "unique constraint" in str(e).lower() or "duplicate key" in str(e).lower():
                if "username" in str(e).lower():
                    raise serializers.ValidationError({"username": f"Пользователь с именем '{username}' уже существует. Пожалуйста, выберите другое имя пользователя."})
                elif "email" in str(e).lower():
                    raise serializers.ValidationError({"email": "Пользователь с такой электронной почтой уже существует"})
            # Re-raise other exceptions
            raise  
            
        return user
    
    def update(self, instance, validated_data):
        """
        Override update method to handle password updates
        """
        # Check username uniqueness only if it changed and not for this user
        username = validated_data.get('username')
        if username and username != instance.username:
            if CustomUser.objects.filter(username=username).exists():
                raise serializers.ValidationError({"username": "Пользователь с таким именем уже существует"})
        
        # Handle password correctly
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
            
        # Update other fields
        for key, value in validated_data.items():
            setattr(instance, key, value)
            
        instance.save()
        return instance


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


class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = ['id', 'name', 'description', 'created_by', 'project', 
                 'created_at', 'updated_at', 'configuration']
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class CustomChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomChart
        fields = ['id', 'name', 'description', 'chart_type', 'data_source', 
                 'configuration', 'custom_query', 'created_by', 'created_at', 
                 'updated_at', 'project']
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class ReportMetricsSerializer(serializers.Serializer):
    success_rate = serializers.FloatField()
    avg_duration = serializers.FloatField()
    total_tests = serializers.IntegerField()


class ReportChartDataSerializer(serializers.Serializer):
    trends = serializers.DictField()
    distribution = serializers.DictField()


class TestReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestRun
        fields = ['id', 'test_case', 'status', 'duration', 'started_at', 'finished_at']


class AnalyticsResponseSerializer(serializers.Serializer):
    metrics = ReportMetricsSerializer()
    charts = ReportChartDataSerializer()
    results = TestReportSerializer(many=True)

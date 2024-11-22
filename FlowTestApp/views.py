from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny, DjangoModelPermissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Project, Folder, TestCase, TestRun, AutomationScript, SchedulerEvent, CustomUser, Role
from .serializers import ProjectSerializer, FolderSerializer, TestCaseSerializer, TestRunSerializer, AutomationScriptSerializer, SchedulerEventSerializer, CustomUserSerializer, RoleSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def folders(self, request, pk=None):
        project = self.get_object()
        folders = project.folders.all()
        serializer = FolderSerializer(folders, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def folders_and_test_cases(self, request, pk=None):
        project = self.get_object()
        folders = project.folders.all()
        folder_serializer = FolderSerializer(folders, many=True)

        test_cases = TestCase.objects.filter(folder_id__project=project)
        test_case_serializer = TestCaseSerializer(test_cases, many=True)

        return Response({
            'folders': folder_serializer.data,
            'test_cases': test_case_serializer.data
        })


class FolderViewSet(viewsets.ModelViewSet):
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def test_cases(self, request, pk=None):
        folder = self.get_object()
        test_cases = folder.test_cases.all()
        serializer = TestCaseSerializer(test_cases, many=True)
        return Response(serializer.data)


class TestCaseViewSet(viewsets.ModelViewSet):
    queryset = TestCase.objects.all()
    serializer_class = TestCaseSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def create_dummy_run(self, request, pk=None):
        test_case = self.get_object()
        test_run = TestRun.create_dummy_run(test_case)
        serializer = TestRunSerializer(test_run)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def create_dummy_script(self, request, pk=None):
        test_case = self.get_object()
        script = AutomationScript.create_dummy_script(test_case)
        serializer = AutomationScriptSerializer(script)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TestRunViewSet(viewsets.ModelViewSet):
    queryset = TestRun.objects.all()
    serializer_class = TestRunSerializer
    permission_classes = [IsAuthenticated]


class AutomationScriptViewSet(viewsets.ModelViewSet):
    queryset = AutomationScript.objects.all()
    serializer_class = AutomationScriptSerializer
    permission_classes = [IsAuthenticated]


class SchedulerEventViewSet(viewsets.ModelViewSet):
    queryset = SchedulerEvent.objects.all()
    serializer_class = SchedulerEventSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['delete'])
    def delete(self, request, pk=None):
        event = self.get_object()
        # Delete all child events if the event has recurrence
        child_events = event.child_events.all()
        child_events.delete()
        event.delete()
        return Response({'message': 'Event and its recurring events deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def create_recurrent_event(self, request, pk=None):
        from datetime import timedelta
        event = self.get_object()
        recurrence = event.recurrence

        if recurrence == 'daily':
            for i in range(1, 8):  # Create events for the next 7 days
                SchedulerEvent.objects.create(
                    title=event.title,
                    description=event.description,
                    event_type=event.event_type,
                    scheduled_time=event.scheduled_time + timedelta(days=i),
                    recurrence='none',
                    parent_event=event,
                    project=event.project
                )
        elif recurrence == 'weekly':
            for i in range(1, 5):  # Create events for the next 4 weeks
                SchedulerEvent.objects.create(
                    title=event.title,
                    description=event.description,
                    event_type=event.event_type,
                    scheduled_time=event.scheduled_time + timedelta(weeks=i),
                    recurrence='none',
                    project=event.project
                )
        elif recurrence == 'monthly':
            for i in range(1, 3):  # Create events for the next 2 months
                SchedulerEvent.objects.create(
                    title=event.title,
                    description=event.description,
                    event_type=event.event_type,
                    scheduled_time=event.scheduled_time + timedelta(days=30 * i),
                    recurrence='none',
                    project=event.project
                )

        return Response({"message": "Recurrent events created successfully"}, status=status.HTTP_201_CREATED)
    serializer_class = SchedulerEventSerializer
    permission_classes = [IsAuthenticated]


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)

        if user is not None:
            return Response({"message": "Успешный вход"}, status=status.HTTP_200_OK)
        else:
            return Response({"message": "Неверное имя пользователя или пароль"}, status=status.HTTP_401_UNAUTHORIZED)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = (AllowAny,)

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def set_role(self, request, pk=None):
        user = self.get_object()
        role = request.data.get('role')
        if role not in [r[0] for r in CustomUser.Roles.choices]:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
        user.role = role
        user.save()
        return Response({'status': 'role set'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def set_permissions(self, request, pk=None):
        user = self.get_object()
        permissions = request.data.get('permissions', [])
        user.user_permissions.set(Permission.objects.filter(codename__in=permissions))
        user.save()
        return Response({'status': 'permissions set'}, status=status.HTTP_200_OK)


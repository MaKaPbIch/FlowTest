from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Project, Folder, TestCase, TestRun, SchedulerEvent, CustomUser, Role, Permission, AutomationProject, TestSchedule, AutomationTest, TestReport
from .serializers import ProjectSerializer, FolderSerializer, TestCaseSerializer, TestRunSerializer, SchedulerEventSerializer, CustomUserSerializer, RoleSerializer, AutomationProjectSerializer, AutomationTestSerializer, TestScheduleSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from .services.automation_service import AutomationService
from datetime import timedelta
from rest_framework.exceptions import ValidationError
from django.db.models import Q, Count, Avg
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.db import models
from .services.repository_service import RepositoryService


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    @action(detail=True, methods=['get'])
    def folders(self, request, pk=None):
        """
        Получить все папки для конкретного проекта
        """
        project = self.get_object()
        folders = project.folders.all()
        serializer = FolderSerializer(folders, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def folders_and_test_cases(self, request, pk=None):
        """
        Получить все папки и тест-кейсы для конкретного проекта
        """
        project = self.get_object()
        folders = project.folders.all()
        folder_data = []
        
        for folder in folders:
            folder_serializer = FolderSerializer(folder)
            test_cases = folder.test_cases.all()
            test_case_serializer = TestCaseSerializer(test_cases, many=True)
            
            folder_info = folder_serializer.data
            folder_info['test_cases'] = test_case_serializer.data
            folder_data.append(folder_info)
        
        return Response(folder_data)


class FolderViewSet(viewsets.ModelViewSet):
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        queryset = Folder.objects.all()
        project_id = self.request.query_params.get('project', None)
        if project_id is not None:
            queryset = queryset.filter(project_id=project_id)
        return queryset

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
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        queryset = TestCase.objects.all()
        folder_id = self.request.query_params.get('folder', None)
        if folder_id is not None:
            queryset = queryset.filter(folder_id=folder_id)
        return queryset

    @action(detail=True, methods=['post'], url_path='execute')
    def run_test(self, request, pk=None):
        """Запуск автоматизированного теста"""
        test_case = self.get_object()
        
        # Проверяем, что тест автоматизированный
        if test_case.test_type != 'automated':
            return Response({
                'status': 'error',
                'message': 'This test case is not automated'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Проверяем наличие кода теста
        if not test_case.test_code:
            return Response({
                'status': 'error',
                'message': 'No test code provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Создаем запись о запуске теста
            test_run = TestRun.objects.create(
                test_case=test_case,
                status='pending',
                framework='pytest'  # или определяем из кода теста
            )

            # Запускаем тест асинхронно через Celery
            from .tasks import run_test
            run_test.delay(test_run.id)
            
            return Response({
                'status': 'success',
                'message': 'Test execution started',
                'test_run_id': test_run.id
            })

        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TestRunViewSet(viewsets.ModelViewSet):
    queryset = TestRun.objects.all()
    serializer_class = TestRunSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        queryset = TestRun.objects.all()
        test_case_id = self.request.query_params.get('test_case', None)
        if test_case_id is not None:
            queryset = queryset.filter(test_case_id=test_case_id)
        return queryset


class SchedulerEventViewSet(viewsets.ModelViewSet):
    queryset = SchedulerEvent.objects.all()
    serializer_class = SchedulerEventSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def delete(self, request, pk=None):
        event = self.get_object()
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def create_recurrent_event(self, request, pk=None):
        event = self.get_object()
        
        # Получаем параметры для создания повторяющихся событий
        recurrence_type = request.data.get('recurrence_type')  # daily, weekly, monthly
        recurrence_count = request.data.get('recurrence_count', 1)  # сколько раз повторить
        
        if not recurrence_type or recurrence_count < 1:
            return Response({
                'error': 'Invalid recurrence parameters'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        created_events = []
        current_time = event.scheduled_time
        
        for i in range(recurrence_count):
            if recurrence_type == 'daily':
                next_time = current_time + timedelta(days=1)
            elif recurrence_type == 'weekly':
                next_time = current_time + timedelta(weeks=1)
            elif recurrence_type == 'monthly':
                # Для простоты используем 30 дней
                next_time = current_time + timedelta(days=30)
            else:
                return Response({
                    'error': 'Invalid recurrence type'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            new_event = SchedulerEvent.objects.create(
                project=event.project,
                scheduled_time=next_time,
                status='pending'
            )
            created_events.append(new_event)
            current_time = next_time
        
        serializer = SchedulerEventSerializer(created_events, many=True)
        return Response(serializer.data)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]


class CustomUserViewSet(viewsets.ModelViewSet):
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return CustomUser.objects.all()
        return CustomUser.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'])
    def get_current_user(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def language(self, request):
        """
        Получить текущий язык пользователя.
        """
        user = request.user
        return Response({'language': user.language})

    @action(detail=False, methods=['post'])
    def set_language(self, request):
        """
        Установить язык пользователя.
        """
        language = request.data.get('language')
        if not language:
            return Response({'error': 'Language is required'}, status=400)
        
        user = request.user
        user.language = language
        user.save()
        
        return Response({'status': 'Language updated'})

    @action(detail=False, methods=['post'])
    def update_theme(self, request):
        """
        Обновление темы пользователя
        """
        theme = request.data.get('theme')
        if not theme:
            return Response({'error': 'Theme is required'}, status=400)
        
        user = request.user
        user.theme = theme
        user.save()
        
        return Response({'status': 'Theme updated'})

    @action(detail=False, methods=['post'])
    def update_user_info(self, request):
        user = request.user
        serializer = CustomUserSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'])
    def update_user_info(self, request, pk=None):
        """
        Обновление информации пользователя, такой как имя, фамилия, никнейм (username), email, и пароль.
        """
        user = self.get_object()
        serializer = CustomUserSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            # Обновляем основные поля
            user = serializer.save()
            
            # Обновляем пароль, если он предоставлен
            password = request.data.get('password')
            if password:
                user.set_password(password)
                user.save()
            
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class AutomationProjectViewSet(viewsets.ModelViewSet):
    queryset = AutomationProject.objects.all()
    serializer_class = AutomationProjectSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']

    def create(self, request, *args, **kwargs):
        print("Request data:", request.data)
        print("Request headers:", request.headers)
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print("Error in create:", str(e))
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        print("Validated data:", serializer.validated_data)
        if not serializer.validated_data.get('project'):
            raise ValidationError("Project is required")
        serializer.save()

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Синхронизация репозитория и обновление тестов"""
        project = self.get_object()
        automation_service = AutomationService()
        try:
            automation_service.sync_repository(project)
            return Response({'status': 'success', 'message': 'Repository synchronized'})
        except Exception as e:
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def tests(self, request, pk=None):
        """Получение списка тестов проекта"""
        project = self.get_object()
        tests = project.tests.all()
        serializer = AutomationTestSerializer(tests, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def run_tests(self, request, pk=None):
        """Запуск выбранных тестов"""
        project = self.get_object()
        test_ids = request.data.get('test_ids', [])
        if not test_ids:
            return Response(
                {'error': 'No tests selected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        automation_service = AutomationService()
        try:
            results = automation_service.run_tests(project, test_ids)
            return Response({'status': 'success', 'results': results})
        except Exception as e:
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def run_all(self, request, pk=None):
        """Запуск всех доступных тестов"""
        project = self.get_object()
        automation_service = AutomationService()
        try:
            results = automation_service.run_all_tests(project)
            return Response({'status': 'success', 'results': results})
        except Exception as e:
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """Планирование запуска тестов"""
        project = self.get_object()
        schedule_data = request.data
        
        serializer = TestScheduleSerializer(data=schedule_data)
        if serializer.is_valid():
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_test_existence(request, test_id):
    """
    Проверяет наличие теста в репозитории и наличие кода теста
    """
    result = RepositoryService.check_test_existence(test_id)
    return Response(result)


@api_view(['GET'])
def tests_over_time(request, project_id):
    """
    Возвращает статистику успешности тестов по времени для указанного проекта
    """
    try:
        # Получаем все тест-кейсы проекта через папки
        project = Project.objects.get(id=project_id)
        print(f"Project found: {project}")
        
        folders = Folder.objects.filter(project=project)
        print(f"Found {folders.count()} folders")
        
        test_cases = TestCase.objects.filter(folder__in=folders)
        print(f"Found {test_cases.count()} test cases")
        
        # Получаем все отчеты за последние 30 дней
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        reports = TestReport.objects.filter(
            test_case__in=test_cases,
            execution_date__gte=thirty_days_ago
        ).order_by('execution_date')
        print(f"Found {reports.count()} reports")
        
        # Группируем отчеты по дням
        daily_stats = {}
        for report in reports:
            date = report.execution_date.date().isoformat()
            if date not in daily_stats:
                daily_stats[date] = {'total': 0, 'passed': 0}
            daily_stats[date]['total'] += 1
            if report.status == 'passed':
                daily_stats[date]['passed'] += 1
        
        print(f"Daily stats: {daily_stats}")

        # Формируем массивы для графика
        dates = sorted(daily_stats.keys())
        success_rates = [
            round((daily_stats[date]['passed'] / daily_stats[date]['total']) * 100)
            if daily_stats[date]['total'] > 0 else 0
            for date in dates
        ]
        
        result = {
            'labels': dates,
            'success_rate': success_rates
        }
        print(f"Returning result: {result}")
        return Response(result)
    except Project.DoesNotExist:
        print("Project not found")
        return Response({'error': 'Project not found'}, status=404)
    except Exception as e:
        print(f"Error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def results_distribution(request, project_id):
    """
    Возвращает распределение результатов тестов для указанного проекта
    """
    try:
        # Получаем все тест-кейсы проекта через папки
        project = Project.objects.get(id=project_id)
        print(f"Project found: {project}")
        
        folders = Folder.objects.filter(project=project)
        print(f"Found {folders.count()} folders")
        
        test_cases = TestCase.objects.filter(folder__in=folders)
        print(f"Found {test_cases.count()} test cases")
        
        # Получаем последние отчеты для каждого тест-кейса
        latest_reports = TestReport.objects.filter(
            test_case__in=test_cases
        ).values('test_case').annotate(
            latest_id=models.Max('id')
        )
        print(f"Found {len(latest_reports)} latest reports")
        
        reports = TestReport.objects.filter(id__in=[r['latest_id'] for r in latest_reports])
        
        # Подсчитываем статистику
        stats = {
            'passed': reports.filter(status='passed').count(),
            'failed': reports.filter(status='failed').count(),
            'skipped': reports.filter(Q(status='skipped') | Q(status='blocked')).count()
        }
        
        print(f"Returning stats: {stats}")
        return Response(stats)
    except Project.DoesNotExist:
        print("Project not found")
        return Response({'error': 'Project not found'}, status=404)
    except Exception as e:
        print(f"Error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def priority_distribution(request, project_id):
    """
    Возвращает распределение тестов по приоритетам для указанного проекта
    """
    try:
        # Получаем все тест-кейсы проекта через папки
        project = Project.objects.get(id=project_id)
        print(f"Project found: {project}")
        
        folders = Folder.objects.filter(project=project)
        print(f"Found {folders.count()} folders")
        
        test_cases = TestCase.objects.filter(folder__in=folders)
        print(f"Found {test_cases.count()} test cases")
        print(f"Test cases priorities: {list(test_cases.values_list('priority', flat=True))}")
        
        # Подсчитываем количество тестов для каждого приоритета
        priority_counts = test_cases.values('priority').annotate(
            count=models.Count('id')
        )
        print(f"Priority counts raw: {list(priority_counts)}")
        
        # Преобразуем результаты в нужный формат
        stats = {
            'High': 0,
            'Medium': 0,
            'Low': 0
        }
        
        for item in priority_counts:
            priority = item['priority']
            if priority in stats:
                stats[priority] = item['count']
        
        print(f"Final stats: {stats}")
        return Response(stats)
    except Project.DoesNotExist:
        print("Project not found")
        return Response({'error': 'Project not found'}, status=404)
    except Exception as e:
        print(f"Error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def test_cases_creation_stats(request, project_id):
    """
    Возвращает статистику по созданию тест-кейсов:
    - количество новых тест-кейсов за каждый день
    - общее количество с накоплением
    - распределение по авторам
    """
    try:
        project = Project.objects.get(id=project_id)
        folders = Folder.objects.filter(project=project)
        test_cases = TestCase.objects.filter(folder__in=folders)
        
        # Статистика по дням
        daily_stats = test_cases.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        # Накопительная статистика
        cumulative_stats = []
        total = 0
        for stat in daily_stats:
            total += stat['count']
            cumulative_stats.append({
                'date': stat['date'],
                'total': total
            })
        
        # Статистика по авторам
        author_stats = test_cases.values(
            'author__username'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'daily': list(daily_stats),
            'cumulative': cumulative_stats,
            'by_author': list(author_stats)
        })
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def test_execution_stats(request, project_id):
    """
    Возвращает статистику по выполнению тестов:
    - среднее время выполнения
    - количество выполненных тестов за день
    - соотношение успешных/неуспешных прогонов
    """
    try:
        project = Project.objects.get(id=project_id)
        folders = Folder.objects.filter(project=project)
        test_cases = TestCase.objects.filter(folder__in=folders)
        reports = TestReport.objects.filter(test_case__in=test_cases)
        
        # Статистика по дням
        daily_stats = reports.annotate(
            date=TruncDate('execution_date')
        ).values('date').annotate(
            total=Count('id'),
            passed=Count('id', filter=Q(status='passed')),
            failed=Count('id', filter=Q(status='failed')),
            avg_time=Avg('execution_time')
        ).order_by('date')
        
        return Response(list(daily_stats))
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
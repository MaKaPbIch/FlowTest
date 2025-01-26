from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.parsers import JSONParser
from rest_framework.renderers import JSONRenderer
from rest_framework.negotiation import DefaultContentNegotiation
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Count, Avg, Max, Q, F
from django.db.models.functions import TruncDate
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async, async_to_sync
import json
import logging
import os
from datetime import datetime, timedelta
from .models import (
    Project, Folder, TestCase, TestRun, Role, CustomUser,
    AutomationProject, SchedulerEvent, TestReport
)
from .serializers import (
    ProjectSerializer, FolderSerializer, TestCaseSerializer,
    RoleSerializer, CustomUserSerializer, AutomationProjectSerializer,
    TestRunSerializer, SchedulerEventSerializer
)
from .services.automation_service import AutomationService
from .services.repository_service import RepositoryService
from .services.scheduler_service import SchedulerService
from .tasks import execute_test
from FlowTest.celery import app

logger = logging.getLogger(__name__)

def create_test_run(test_case):
    """Создает новый тестовый прогон"""
    test_run = TestRun(
        test_case=test_case,
        status='pending',
        started_at=timezone.now(),
        log_output='Test execution started...\n'
    )
    test_run.save()
    return test_run

@sync_to_async
def get_test_run(test_run_id):
    test_run = TestRun.objects.get(id=test_run_id)
    test_run.test_case  # Загружаем test_case сразу
    return test_run

@sync_to_async
def save_test_run(test_run):
    test_run.save()

async def run_test_in_thread(test_run_id):
    """Запуск теста в отдельном потоке"""
    try:
        logger.info(f"Starting test execution in thread for test run {test_run_id}")
        
        # Получаем тестовый прогон и тест
        test_run = await sync_to_async(TestRun.objects.get)(id=test_run_id)
        test_case = test_run.test_case  # Теперь test_case уже загружен
        
        # Обновляем статус на running
        test_run.status = 'running'
        test_run.log_output = 'Initializing browser...\n'
        await sync_to_async(test_run.save)()
        
        # Импортируем Playwright здесь, чтобы не блокировать основной поток
        from playwright.sync_api import sync_playwright
        import threading
        
        def run_playwright_test():
            try:
                # Запускаем Playwright
                with sync_playwright() as p:
                    # Запускаем браузер в видимом режиме
                    browser = p.chromium.launch(
                        headless=False,  # Браузер будет видимым
                        args=['--start-maximized']  # Запускаем в полноэкранном режиме
                    )
                    
                    try:
                        # Создаем контекст и страницу
                        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
                        page = context.new_page()
                        
                        # Создаем локальные переменные для теста
                        test_locals = {
                            'page': page,
                            'context': context,
                            'browser': browser,
                            'test_run': test_run,
                            'logger': logger,
                        }
                        
                        # Выполняем тестовый код
                        exec(test_case.test_code, test_locals)
                        
                        # Если дошли до сюда без ошибок, тест пройден
                        test_run.status = 'passed'
                        test_run.finished_at = timezone.now()
                        test_run.duration = (test_run.finished_at - test_run.started_at).total_seconds()
                        test_run.log_output += '\nTest completed successfully\n'
                        
                    except Exception as e:
                        # Если произошла ошибка при выполнении теста
                        import traceback
                        error_details = f'\nTest failed: {str(e)}\n{traceback.format_exc()}'
                        test_run.status = 'failed'
                        test_run.finished_at = timezone.now()
                        test_run.duration = (test_run.finished_at - test_run.started_at).total_seconds()
                        test_run.error_message = str(e)
                        test_run.log_output += error_details
                    
                    finally:
                        # Закрываем браузер
                        if 'context' in locals():
                            context.close()
                        browser.close()
            
            except Exception as e:
                # Если произошла ошибка при инициализации Playwright
                logger.error(f"Error initializing Playwright: {str(e)}", exc_info=True)
                test_run.status = 'error'
                test_run.finished_at = timezone.now()
                test_run.duration = (test_run.finished_at - test_run.started_at).total_seconds()
                test_run.error_message = f'Failed to initialize Playwright: {str(e)}'
                test_run.log_output += '\nFailed to initialize browser\n'
        
        # Запускаем Playwright в отдельном потоке
        thread = threading.Thread(target=run_playwright_test)
        thread.start()
        thread.join()  # Ждем завершения теста
        
        # Сохраняем результаты
        await sync_to_async(test_run.save)()
            
    except Exception as e:
        # Если произошла ошибка при инициализации теста
        logger.error(f"Error during test execution: {str(e)}", exc_info=True)
        try:
            test_run = await sync_to_async(TestRun.objects.get)(id=test_run_id)
            test_run.status = 'error'
            test_run.finished_at = timezone.now()
            test_run.duration = (test_run.finished_at - test_run.started_at).total_seconds()
            test_run.error_message = f'Failed to initialize test: {str(e)}'
            test_run.log_output = 'Test initialization failed\n'
            await sync_to_async(test_run.save)()
        except Exception as e2:
            logger.error(f"Failed to update test run status: {str(e2)}", exc_info=True)

def run_test_in_thread_sync(test_run_id):
    """Синхронная обертка для запуска теста"""
    asyncio.run(run_test_in_thread(test_run_id))

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

    def perform_create(self, serializer):
        """Автоматически устанавливаем текущего пользователя как автора"""
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """
        Редирект на асинхронный endpoint
        """
        return Response({
            'status': 'error',
            'error': 'Please use /api/execute-test/<test_id>/ endpoint'
        }, status=400)
    
    @action(detail=True, methods=['get'])
    def get_test_status(self, request, pk=None):
        """
        Получить статус выполнения теста
        """
        logger.info(f"Getting status for test run {pk}")
        
        try:
            test_run = TestRun.objects.get(id=pk)
            return Response({
                'status': test_run.status,
                'started_at': test_run.started_at,
                'finished_at': test_run.finished_at,
                'duration': test_run.duration,
                'output': test_run.log_output,
                'error': test_run.error_message
            })
        except TestRun.DoesNotExist:
            return Response({
                'status': 'error',
                'error': f'Test run {pk} not found'
            }, status=404)
        except Exception as e:
            logger.error(f"Error getting test status: {str(e)}", exc_info=True)
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=500)


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

    @action(detail=True, methods=['get'], url_path='status')
    def get_test_status(self, request, pk=None):
        """
        Получить статус выполнения теста
        """
        logger.info(f"Getting status for test run {pk}")
        
        try:
            test_run = TestRun.objects.get(id=pk)
            
            return Response({
                'status': test_run.status,
                'started_at': test_run.created_at,
                'finished_at': test_run.finished_at,
                'duration': test_run.duration,
                'output': test_run.log_output,
                'error': test_run.error_message
            })
            
        except TestRun.DoesNotExist:
            return Response({
                'status': 'error',
                'error': f'Test run {pk} not found'
            }, status=404)
            
        except Exception as e:
            logger.error(f"Error getting test status: {str(e)}", exc_info=True)
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=500)


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
        serializer = TestCaseSerializer(tests, many=True)
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
        
        serializer = SchedulerEventSerializer(data=schedule_data)
        if serializer.is_valid():
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


class AsyncAuthMixin(APIView):
    """
    Миксин для асинхронной аутентификации в классах-представлениях
    """
    renderer_classes = [JSONRenderer]
    content_negotiation_class = DefaultContentNegotiation
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.headers = {}

    def prepare_request(self, request):
        """
        Подготавливает request для DRF
        """
        request.query_params = request.GET
        request.data = getattr(request, '_body', request.POST)
        request._request = request
        request._full_data = request.data
        return request

    async def dispatch(self, request, *args, **kwargs):
        """
        Асинхронная обработка запроса с поддержкой аутентификации
        """
        self.args = args
        self.kwargs = kwargs
        self.request = self.prepare_request(request)
        self.headers = {}
        self.format_kwarg = None

        # Выполняем аутентификацию асинхронно
        if not hasattr(request, '_user'):
            request._user = await sync_to_async(self._authenticate_credentials, thread_sensitive=False)(request)
            request.user = request._user

        # Определяем формат ответа
        request.accepted_renderer = self.renderer_classes[0]()
        request.accepted_media_type = request.accepted_renderer.media_type

        try:
            handler = getattr(self, request.method.lower())
            response = await handler(request, *args, **kwargs)
            
            if not isinstance(response, Response):
                response = Response(response)
            
            response.accepted_renderer = request.accepted_renderer
            response.accepted_media_type = request.accepted_media_type
            response.renderer_context = {
                'view': self,
                'args': self.args,
                'kwargs': self.kwargs,
                'request': request
            }
            
            return response

        except Exception as exc:
            response = self.handle_exception(exc)
            response.accepted_renderer = request.accepted_renderer
            response.accepted_media_type = request.accepted_media_type
            response.renderer_context = {
                'view': self,
                'args': self.args,
                'kwargs': self.kwargs,
                'request': request
            }
            return response

    def _authenticate_credentials(self, request):
        """
        Синхронная функция для аутентификации, которую мы обернем в sync_to_async
        """
        for authenticator in self.authentication_classes:
            try:
                user_auth_tuple = authenticator().authenticate(request)
                if user_auth_tuple is not None:
                    return user_auth_tuple[0]
            except:
                continue
        return None


class TestExecutionView(AsyncAuthMixin):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    async def post(self, request, test_id):
        logger.info(f"Executing test {test_id}")
        try:
            test_case = await sync_to_async(TestCase.objects.get)(id=test_id)
            logger.info(f"Found test case: {test_case}")
            
            # Создаем новый тестовый прогон
            test_run = await sync_to_async(TestRun.objects.create)(
                test_case=test_case,
                status='pending',
                started_at=timezone.now()
            )
            logger.info(f"Created test run: {test_run}")
            
            # Запускаем выполнение теста в Celery
            from .tasks import execute_test
            task = execute_test.delay(test_run.id)
            logger.info(f"Started Celery task: {task.id}")
            
            return Response({
                'status': 'success',
                'message': 'Test execution started',
                'test_run_id': test_run.id,
                'task_id': task.id
            })
            
        except TestCase.DoesNotExist:
            logger.error(f"Test case {test_id} not found")
            return Response({
                'status': 'error',
                'error': f'Test case {test_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Error executing test {test_id}: {str(e)}", exc_info=True)
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def options(self, request, *args, **kwargs):
        """
        Handle preflight CORS requests
        """
        response = Response()
        response["Access-Control-Allow-Origin"] = "http://127.0.0.1:8080"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

class TestStatusView(AsyncAuthMixin):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    async def get(self, request, test_run_id):
        """
        Получение статуса выполнения теста
        """
        logger.info(f"Getting status for test run {test_run_id}")
        
        try:
            test_run = await sync_to_async(TestRun.objects.select_related('test_case').get)(id=test_run_id)
            
            response_data = {
                'status': test_run.status,
                'test_case_id': test_run.test_case.id if test_run.test_case else None,
                'test_case_title': test_run.test_case.title if test_run.test_case else None,
                'started_at': test_run.started_at.isoformat() if test_run.started_at else None,
                'finished_at': test_run.finished_at.isoformat() if test_run.finished_at else None,
                'duration': test_run.duration,
                'error_message': test_run.error_message,
                'log_output': test_run.log_output
            }
            
            return Response(response_data)
            
        except TestRun.DoesNotExist:
            return Response({
                'status': 'error',
                'error': f'Test run {test_run_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Error getting test status: {str(e)}", exc_info=True)
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def options(self, request, *args, **kwargs):
        """
        Handle preflight CORS requests
        """
        response = Response()
        response["Access-Control-Allow-Origin"] = "http://127.0.0.1:8080"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

class CheckTestExistenceView(AsyncAuthMixin):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    async def get(self, request, test_id):
        """
        Проверка существования теста в репозитории
        """
        try:
            result = await sync_to_async(RepositoryService.check_test_existence, thread_sensitive=False)(test_id)
            return Response(result)
        except Exception as e:
            logger.error(f"Error checking test existence: {str(e)}", exc_info=True)
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=500)


@api_view(['POST'])
def execute_test_api(request, test_id):
    """Запуск теста"""
    try:
        test_case = TestCase.objects.get(id=test_id)
        # Создаем запись о запуске теста
        test_run = TestRun.objects.create(
            test_case=test_case,
            status='pending'
        )
        return Response({'test_run_id': test_run.id})
    except TestCase.DoesNotExist:
        return Response({'error': 'Test not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def check_test_existence(request, test_id):
    """
    Проверяет наличие теста в репозитории и наличие кода теста
    """
    result = RepositoryService.check_test_existence(test_id)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
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
            latest_id=Max('id')
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
@permission_classes([IsAuthenticated])
def priority_distribution(request, project_id):
    """
    Возвращает распределение тестов по приоритетам для указанного проекта
    """
    try:
        # Получаем все тест-кейсы проекта через папки
        project = Project.objects.get(id=project_id)
        folders = Folder.objects.filter(project=project)
        test_cases = TestCase.objects.filter(folder__in=folders)
        
        # Подсчитываем количество тестов для каждого приоритета
        distribution = test_cases.values('priority').annotate(
            count=Count('id')
        ).order_by('priority')
        
        # Преобразуем в словарь для удобства
        result = {
            'high': 0,
            'medium': 0,
            'low': 0
        }
        
        for item in distribution:
            if item['priority'] in result:
                result[item['priority']] = item['count']
        
        return Response(result)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    except Exception as e:
        print(f"Error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
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
        
        # Получаем все отчеты за последние 30 дней
        now = timezone.now()
        thirty_days_ago = now - timezone.timedelta(days=30)
        
        reports = TestReport.objects.filter(
            test_case__in=test_cases,
            execution_date__gte=thirty_days_ago
        )
        
        # Считаем общую статистику
        total_reports = reports.count()
        if total_reports > 0:
            avg_duration = reports.aggregate(Avg('duration'))['duration__avg'] or 0
            success_rate = reports.filter(status='passed').count() / total_reports * 100
        else:
            avg_duration = 0
            success_rate = 0
            
        # Создаем словарь для всех дней в диапазоне
        daily_stats = {}
        current_date = thirty_days_ago.date()
        while current_date <= now.date():
            daily_stats[current_date.isoformat()] = 0
            current_date += timezone.timedelta(days=1)

        # Считаем количество тестов по дням
        for report in reports:
            date = report.execution_date.date().isoformat()
            daily_stats[date] += 1

        # Формируем массивы для графика
        dates = sorted(daily_stats.keys())
        tests_per_day = [daily_stats[date] for date in dates]

        return Response({
            'avg_duration': round(avg_duration, 1),
            'success_rate': round(success_rate, 1),
            'total_reports': total_reports,
            'dates': dates,
            'tests_per_day': tests_per_day
        })
        
    except Project.DoesNotExist:
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
            'author_id'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        print("Debug - Author stats:", author_stats)  # Отладочный вывод
        
        # Форматируем данные об авторах
        formatted_author_stats = []
        for stat in author_stats:
            author_id = stat['author_id']
            print(f"Debug - Processing author_id: {author_id}")  # Отладочный вывод
            try:
                if author_id:
                    author = CustomUser.objects.get(id=author_id)
                    print(f"Debug - Found author: {author.username}, {author.first_name}, {author.last_name}")  # Отладочный вывод
                    author_name = f"{author.first_name} {author.last_name}"
                    if not author_name.strip():  # Если имя пустое, используем username
                        author_name = author.username
                else:
                    author_name = "Unknown"
                    print("Debug - No author_id")  # Отладочный вывод
            except CustomUser.DoesNotExist:
                author_name = "Unknown"
                print(f"Debug - Author with id {author_id} not found")  # Отладочный вывод
                
            formatted_author_stats.append({
                'author': author_name,
                'count': stat['count']
            })
        
        return Response({
            'daily': list(daily_stats),
            'cumulative': cumulative_stats,
            'by_author': formatted_author_stats
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
        now = timezone.now()
        thirty_days_ago = now - timezone.timedelta(days=30)
        print(f"Current time: {now}")
        print(f"Thirty days ago: {thirty_days_ago}")

        reports = TestReport.objects.filter(
            test_case__in=test_cases,
            execution_date__gte=thirty_days_ago
        ).order_by('execution_date')
        print(f"Found {reports.count()} reports in last 30 days")
        
        # Создаем словарь для всех дней в диапазоне
        daily_stats = {}
        current_date = thirty_days_ago.date()
        while current_date <= now.date():
            daily_stats[current_date.isoformat()] = {'total': 0, 'passed': 0}
            current_date += timezone.timedelta(days=1)

        # Заполняем статистику по имеющимся отчетам
        for report in reports:
            date = report.execution_date.date().isoformat()
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
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def test_flakiness(request, project_id):
    """
    Возвращает статистику по нестабильности тестов:
    - количество падений для каждого теста
    - общее количество запусков
    """
    try:
        # Получаем все тест-кейсы проекта
        test_cases = TestCase.objects.filter(folder__project_id=project_id)
        
        # Для каждого теста вычисляем статистику нестабильности
        test_stats = []
        for test in test_cases:
            # Получаем все прогоны теста
            runs = TestRun.objects.filter(test_case=test)
            total_runs = runs.count()
            
            if total_runs >= 2:  # Нужно минимум 2 запуска
                # Считаем количество падений
                failed_runs = runs.filter(status='failed').count()
                
                if failed_runs > 0:  # Добавляем только тесты с падениями
                    test_stats.append({
                        'name': test.title,
                        'failed_runs': failed_runs,
                        'total_runs': total_runs
                    })
        
        # Сортируем тесты по количеству падений (по убыванию)
        test_stats.sort(key=lambda x: x['failed_runs'], reverse=True)
        
        # Возвращаем топ-10 тестов
        return JsonResponse({
            'tests': test_stats[:10]
        })
        
    except Exception as e:
        logger.error(f"Error calculating test flakiness: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)
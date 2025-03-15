from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Project, TestCase, TestRun, TestEvent, TestReport, Folder
from .serializers import ProjectSerializer, TestCaseSerializer, TestRunSerializer, TestEventSerializer, TestReportSerializer, FolderSerializer
import logging
import tempfile
import subprocess
import os
import sys
from datetime import datetime
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from celery import shared_task
import threading
from django.utils import timezone

logger = logging.getLogger(__name__)

def run_test_in_thread(test_run_id):
    """Запуск теста в отдельном потоке"""
    try:
        # Получаем объект теста
        test_run = TestRun.objects.get(id=test_run_id)
        test_case = test_run.test_case
        
        # Обновляем статус и время начала
        test_run.status = 'running'
        test_run.started_at = timezone.now()
        test_run.log_output = 'Initializing browser...\n'
        test_run.save()
        
        def update_log(message):
            """Обновление логов теста"""
            test_run.log_output += message + "\n"
            test_run.save()
        
        # Импортируем Playwright здесь, чтобы не блокировать основной поток
        from playwright.sync_api import sync_playwright
        
        # Запускаем Playwright
        with sync_playwright() as p:
            # Запускаем браузер в видимом режиме
            browser = p.chromium.launch(
                headless=False,  # Браузер будет видимым
                args=['--start-maximized']  # Запускаем в полноэкранном режиме
            )
            
            # Создаем контекст и страницу
            context = browser.new_context(viewport={'width': 1920, 'height': 1080})
            page = context.new_page()
            
            # Добавляем логирование
            update_log('Browser started. Running test...')
            
            try:
                # Выполняем тестовый код
                exec(test_case.test_code, {
                    'page': page,
                    'context': context,
                    'browser': browser,
                    'update_log': update_log,
                    'test_run': test_run
                })
                
                # Если дошли до сюда без ошибок, тест пройден
                test_run.status = 'passed'
                test_run.log_output += '\nTest completed successfully!'
                test_run.save()
                
            except Exception as e:
                # Если произошла ошибка при выполнении теста
                import traceback
                error_details = f'\nTest failed: {str(e)}\n{traceback.format_exc()}'
                test_run.status = 'failed'
                test_run.error_message = str(e)
                test_run.log_output += error_details
                test_run.save()
            
            finally:
                # Закрываем браузер
                context.close()
                browser.close()
                
                # Обновляем время завершения и длительность
                test_run.finished_at = timezone.now()
                if test_run.started_at:
                    test_run.duration = (test_run.finished_at - test_run.started_at).total_seconds()
                test_run.save()
                
    except Exception as e:
        # Если произошла ошибка при инициализации
        test_run = TestRun.objects.get(id=test_run_id)
        test_run.status = 'error'
        test_run.error_message = f'Failed to initialize test: {str(e)}'
        test_run.finished_at = timezone.now()
        if test_run.started_at:
            test_run.duration = (test_run.finished_at - test_run.started_at).total_seconds()
        test_run.save()

@shared_task
def execute_test(test_run_id):
    """Запуск теста в отдельном потоке"""
    thread = threading.Thread(
        target=run_test_in_thread,
        args=(test_run_id,)
    )
    thread.daemon = True  # Делаем поток демоном, чтобы он завершался вместе с основным
    thread.start()

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

class FolderViewSet(viewsets.ModelViewSet):
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer
    
    def get_queryset(self):
        queryset = Folder.objects.all()
        project_id = self.request.query_params.get('project', None)
        if project_id is not None:
            queryset = queryset.filter(project_id=project_id)
        return queryset

class TestCaseViewSet(viewsets.ModelViewSet):
    queryset = TestCase.objects.all()
    serializer_class = TestCaseSerializer
    
    def get_queryset(self):
        queryset = TestCase.objects.all()
        folder_id = self.request.query_params.get('folder', None)
        if folder_id is not None:
            queryset = queryset.filter(folder_id=folder_id)
        return queryset
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """
        Запуск теста
        """
        logger.info(f"Starting test execution for test case {pk}")
        test_case = self.get_object()
        
        # Если тестовый код не задан, используем пример
        if not test_case.test_code:
            test_case.test_code = '''
# Пример теста с использованием Playwright
import time

try:
    # Переходим на страницу
    update_log("Navigating to example.com...")
    page.goto("https://example.com")
    
    # Ждем загрузки заголовка
    update_log("Waiting for title...")
    page.wait_for_selector("h1")
    
    # Получаем текст заголовка
    title = page.locator("h1").text_content()
    update_log(f"Found title: {title}")
    
    # Делаем скриншот
    update_log("Taking screenshot...")
    page.screenshot(path="example_screenshot.png")
    
    # Добавляем небольшую задержку для демонстрации
    update_log("Waiting for 2 seconds...")
    time.sleep(2)
    
    # Проверяем заголовок
    assert "Example Domain" in title, f"Unexpected title: {title}"
    update_log("Title verification passed!")
    
    # Проверяем наличие параграфа
    update_log("Checking for paragraph...")
    text = page.locator("p").first.text_content()
    update_log(f"Found text: {text}")
    
    # Проверяем ссылки
    update_log("Checking links...")
    links = page.locator("a").all()
    for link in links:
        href = link.get_attribute("href")
        text = link.text_content()
        update_log(f"Found link: {text} -> {href}")
    
except Exception as e:
    update_log(f"Test failed: {str(e)}")
    raise
'''
            test_case.save()
        
        try:
            # Создаем новый тестовый прогон
            test_run = TestRun.objects.create(
                test_case=test_case,
                status='running',
                started_at=timezone.now(),
                framework='playwright',
                log_output='Test execution started...\n'
            )
            
            # Запускаем тест в отдельном потоке
            execute_test.delay(test_run.id)
            
            return Response({
                'status': 'started',
                'test_run_id': test_run.id,
                'message': 'Test execution started',
                'started_at': test_run.started_at,
                'framework': test_run.framework
            })
            
        except Exception as e:
            logger.error(f"Error starting test execution: {str(e)}", exc_info=True)
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=500)
    
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

class TestEventViewSet(viewsets.ModelViewSet):
    queryset = TestEvent.objects.all()
    serializer_class = TestEventSerializer

class TestReportViewSet(viewsets.ModelViewSet):
    queryset = TestReport.objects.all()
    serializer_class = TestReportSerializer

class TestRunViewSet(viewsets.ModelViewSet):
    queryset = TestRun.objects.all()
    serializer_class = TestRunSerializer

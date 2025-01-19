from celery import shared_task
from django.utils import timezone
from .models import AutomationProject, TestSchedule, TestRun, TestEvent, TestReport
from .services.automation_service import AutomationService
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import subprocess
import tempfile
import os
from datetime import datetime
import logging
from FlowTest.celery import app
from playwright.sync_api import sync_playwright
import threading

logger = logging.getLogger(__name__)

def get_test_run(test_run_id):
    return TestRun.objects.get(id=test_run_id)

def update_test_run(test_run, **kwargs):
    for key, value in kwargs.items():
        setattr(test_run, key, value)
    test_run.save()

@app.task
def run_scheduled_tests(schedule_id):
    """Запуск запланированных тестов"""
    try:
        schedule = TestSchedule.objects.get(id=schedule_id)
        project = schedule.project
        service = AutomationService()

        # Если тесты не указаны, запускаем все доступные тесты
        if schedule.tests.exists():
            test_ids = schedule.tests.values_list('id', flat=True)
            result = service.run_tests(project, test_ids)
        else:
            result = service.run_all_tests(project)

        # Обновляем статус расписания
        schedule.last_run = timezone.now()
        schedule.last_status = 'success' if result.get('success') else 'error'
        schedule.last_result = result.get('output', '')
        schedule.save()

        return result
    except Exception as e:
        if schedule:
            schedule.last_status = 'error'
            schedule.last_result = str(e)
            schedule.save()
        return {'success': False, 'error': str(e)}

@app.task
def check_scheduled_tests():
    """Проверка и запуск тестов по расписанию"""
    now = timezone.now()
    schedules = TestSchedule.objects.filter(
        schedule_time__lte=now,
        is_active=True
    ).exclude(
        last_run__date=now.date()  # Исключаем уже запущенные сегодня
    )

    for schedule in schedules:
        run_scheduled_tests.delay(schedule.id)

@app.task
def run_test(test_run_id):
    """Запуск одиночного теста"""
    from .models import TestRun, TestEvent, TestReport
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    import subprocess
    import tempfile
    import os
    from datetime import datetime
    import logging
    import sys

    logger = logging.getLogger(__name__)
    logger.info(f"Starting test execution for test_run_id: {test_run_id}")

    try:
        # Получаем объекты
        test_run = get_test_run(test_run_id)
        test_case = test_run.test_case
        channel_layer = get_channel_layer()
        group_name = f'test_execution_{test_run_id}'
        
        # Проверяем наличие Playwright
        try:
            import playwright
            logger.info("Playwright is installed")
        except ImportError:
            logger.error("Playwright is not installed")
            subprocess.run([sys.executable, '-m', 'pip', 'install', 'playwright'])
            subprocess.run([sys.executable, '-m', 'playwright', 'install', 'chromium'])
            logger.info("Installed Playwright and browsers")

        # Обновляем статус на "running"
        update_test_run(test_run, status='running')
        
        # Отправляем обновление через WebSocket
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'test_update',
                'data': {
                    'status': 'running',
                    'message': 'Starting test execution'
                }
            }
        )

        # Создаем временный файл для теста
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(test_case.test_code)
            test_file = f.name
        logger.info(f"Created temporary test file at {test_file}")

        # Создаем отчет о тесте
        test_report = TestReport.objects.create(
            test_case=test_case,
            status='in_progress'
        )

        # Отправляем обновление о начале выполнения
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'test_update',
                'data': {
                    'status': 'running',
                    'message': 'Executing test with Playwright...'
                }
            }
        )

        start_time = datetime.now()
        logger.info("Starting pytest execution with Playwright...")

        # Запускаем тест через pytest с нужными опциями
        env = os.environ.copy()
        env['PYTHONUNBUFFERED'] = '1'  # Отключаем буферизацию вывода
        
        result = subprocess.run(
            [
                sys.executable, '-m', 'pytest',
                test_file,
                '--headed',  # Показываем браузер
                '--video=on',  # Записываем видео
                '-v',  # Подробный вывод
                '--capture=tee-sys',  # Захватываем весь вывод
                '--log-cli-level=INFO'  # Включаем логи
            ],
            capture_output=True,
            text=True,
            env=env
        )
        
        logger.info(f"Pytest execution completed with return code: {result.returncode}")
        logger.info(f"Test output: {result.stdout}")
        if result.stderr:
            logger.error(f"Test errors: {result.stderr}")

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        # Обновляем статус и результат
        success = result.returncode == 0
        status = 'passed' if success else 'failed'
        
        update_test_run(
            test_run,
            status=status,
            finished_at=end_time,
            duration=duration,
            log_output=result.stdout,
            error_message=result.stderr if not success else None
        )

        test_report.status = status
        test_report.execution_time = duration
        test_report.actual_result = result.stdout
        test_report.save()

        # Создаем событие о завершении теста
        TestEvent.objects.create(
            test_case=test_case,
            test_report=test_report,
            event_type='finish',
            description=f'Test {status}',
            details={
                'stdout': result.stdout,
                'stderr': result.stderr,
                'duration': duration
            }
        )

        # Отправляем финальное обновление через WebSocket
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'test_update',
                'data': {
                    'status': status,
                    'duration': duration,
                    'output': result.stdout,
                    'error': result.stderr if not success else None,
                    'message': f'Test {status} in {duration:.2f} seconds'
                }
            }
        )

        # Удаляем временный файл
        os.unlink(test_file)
        logger.info("Cleaned up temporary test file")

        return {
            'success': success,
            'output': result.stdout,
            'error': result.stderr if not success else None
        }

    except Exception as e:
        logger.error(f"Error during test execution: {str(e)}", exc_info=True)
        if 'test_run' in locals():
            update_test_run(test_run, status='error', error_message=str(e))

            # Отправляем сообщение об ошибке через WebSocket
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'test_update',
                    'data': {
                        'status': 'error',
                        'error': str(e),
                        'message': f'Error: {str(e)}'
                    }
                }
            )

        return {'success': False, 'error': str(e)}

def run_test_code(test_code):
    result = {'success': False, 'error': None}
    
    try:
        with sync_playwright() as p:
            # Запускаем браузер в видимом режиме с замедлением
            browser = p.chromium.launch(
                headless=False,  # Делаем браузер видимым
                slow_mo=1000,    # Замедляем действия на 1 секунду
            )
            context = browser.new_context(
                viewport={'width': 1280, 'height': 720}  # Устанавливаем размер окна
            )
            page = context.new_page()
            
            # Добавляем базовые функции для подсветки элементов
            page.add_init_script("""
                window.highlight = function(selector) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const oldOutline = element.style.outline;
                        element.style.outline = '3px solid red';
                        setTimeout(() => {
                            element.style.outline = oldOutline;
                        }, 1000);
                    }
                }
            """)
            
            # Перехватываем вызовы методов page для добавления подсветки
            original_click = page.click
            async def click_with_highlight(*args, **kwargs):
                if args:
                    await page.evaluate('highlight("' + args[0] + '")')
                    await page.wait_for_timeout(500)  # Ждем, чтобы увидеть подсветку
                return await original_click(*args, **kwargs)
            page.click = click_with_highlight

            # Выполняем тестовый код
            exec(test_code, {'page': page})
            
            # Даем время на просмотр результата
            page.wait_for_timeout(2000)
            
            browser.close()
            result['success'] = True
            
    except Exception as e:
        result['error'] = str(e)
        logger.error(f"Error running test code: {e}")
    
    return result

@shared_task(name='FlowTestApp.tasks.execute_test')
def execute_test(test_run_id):
    logger.info(f"Starting test execution for test run {test_run_id}")
    try:
        # Получаем TestRun
        test_run = TestRun.objects.get(id=test_run_id)
        logger.info(f"Found test run: {test_run}")
        
        # Получаем код теста
        test_code = test_run.test_case.test_code
        logger.info(f"Test code: {test_code}")
        
        # Обновляем статус
        test_run.status = 'running'
        test_run.save()
        logger.info("Updated status to running")

        # Запускаем тест в отдельном потоке
        result = run_test_code(test_code)
        
        # Обновляем результат
        test_run.finished_at = timezone.now()
        test_run.duration = (test_run.finished_at - test_run.started_at).total_seconds()
        
        if result['success']:
            test_run.status = 'completed'
            test_run.error_message = None
            logger.info("Test completed successfully")
        else:
            test_run.status = 'error'
            test_run.error_message = result['error']
            logger.error(f"Test execution error: {result['error']}")
        
        test_run.save()
        logger.info(f"Test run finished. Status: {test_run.status}")
                
        return {
            'status': test_run.status,
            'error': test_run.error_message,
            'duration': test_run.duration
        }
        
    except TestRun.DoesNotExist:
        logger.error(f"Test run {test_run_id} not found")
        return {
            'status': 'error',
            'error': f'Test run {test_run_id} not found'
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            'status': 'error',
            'error': str(e)
        }

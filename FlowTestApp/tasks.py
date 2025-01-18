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

@shared_task
def run_scheduled_tests(schedule_id):
    """Запуск запланированных тестов"""
    try:
        schedule = TestSchedule.objects.get(id=schedule_id)
        project = schedule.project
        service = AutomationService()

        # Если тесты не указаны, запускаем все доступные тесты
        if schedule.tests.exists():
            test_ids = list(schedule.tests.values_list('id', flat=True))
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

@shared_task
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

@shared_task
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

    logger = logging.getLogger(__name__)
    logger.info(f"Starting test execution for test_run_id: {test_run_id}")

    try:
        # Получаем объекты
        test_run = TestRun.objects.get(id=test_run_id)
        test_case = test_run.test_case
        channel_layer = get_channel_layer()
        group_name = f'test_execution_{test_run_id}'
        logger.info(f"Retrieved test run and channel layer for test_run_id: {test_run_id}")

        # Обновляем статус на "running"
        test_run.status = 'running'
        test_run.save()
        logger.info(f"Updated test run status to 'running' for test_run_id: {test_run_id}")

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
        logger.info(f"Sent 'running' status update for test_run_id: {test_run_id}")

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
        logger.info(f"Created test report with ID: {test_report.id}")

        # Отправляем обновление о начале выполнения
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'test_update',
                'data': {
                    'status': 'running',
                    'message': 'Executing test...'
                }
            }
        )

        start_time = datetime.now()
        logger.info("Starting pytest execution...")

        # Запускаем тест через pytest
        result = subprocess.run(
            ['pytest', test_file, '-v'],
            capture_output=True,
            text=True
        )
        logger.info(f"Pytest execution completed with return code: {result.returncode}")

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        # Обновляем статус и результат
        success = result.returncode == 0
        status = 'passed' if success else 'failed'
        
        test_run.status = status
        test_run.finished_at = end_time
        test_run.duration = duration
        test_run.log_output = result.stdout
        test_run.error_message = result.stderr if not success else None
        test_run.save()
        logger.info(f"Updated test run with status '{status}' and duration {duration}s")

        test_report.status = status
        test_report.execution_time = duration
        test_report.actual_result = result.stdout
        test_report.save()
        logger.info(f"Updated test report with status '{status}'")

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
        logger.info("Created test completion event")

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
        logger.info(f"Sent final status update: {status}")

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
            test_run.status = 'error'
            test_run.error_message = str(e)
            test_run.save()
            logger.info("Updated test run with error status")

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
            logger.info("Sent error status update")

        return {'success': False, 'error': str(e)}

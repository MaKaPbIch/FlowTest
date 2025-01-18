import os
import subprocess
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
from django.utils import timezone
from ..models import TestCase, AutomationTest, TestRun, TestReport, TestEvent
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class TestRunner:
    def __init__(self, test_case: TestCase):
        self.test_case = test_case
        self.automation_test = AutomationTest.objects.get(project=test_case.automation_project, file_path=test_case.script_path)
        self.repo_path = Path(f"temp_repos/{test_case.automation_project.project.id}/{hash(test_case.automation_project.repository_url)}")
        self.test_run = None
        self.test_report = None
        self.channel_layer = get_channel_layer()

    def _send_update(self, data):
        """Отправляет обновление через WebSocket"""
        if self.test_run:
            async_to_sync(self.channel_layer.group_send)(
                f'test_execution_{self.test_run.id}',
                {
                    'type': 'test_update',
                    'data': data
                }
            )

    def _create_event(self, event_type, description, severity='info', details=None):
        """Создает событие и отправляет обновление через WebSocket"""
        event = TestEvent.objects.create(
            test_case=self.test_case,
            test_report=self.test_report,
            event_type=event_type,
            description=description,
            severity=severity,
            details=details
        )
        
        self._send_update({
            'event': {
                'type': event.event_type,
                'description': event.description,
                'severity': event.severity,
                'timestamp': event.timestamp.isoformat()
            },
            'status': self.test_run.status if self.test_run else None
        })

    def _prepare_environment(self) -> bool:
        """Подготавливает окружение для запуска теста"""
        try:
            # Создаем TestRun и TestReport
            self.test_run = TestRun.objects.create(
                test_case=self.test_case,
                status='in_progress'
            )
            
            self.test_report = TestReport.objects.create(
                test_case=self.test_case,
                status='in_progress'
            )

            # Логируем начало выполнения
            self._create_event(
                'start',
                'Test execution started',
                'info',
                {'framework': self.test_case.framework}
            )

            return True
        except Exception as e:
            print(f"Error preparing environment: {str(e)}")
            return False

    def _run_pytest(self) -> Dict:
        """Запускает тест с помощью pytest"""
        try:
            result = subprocess.run(
                [
                    'pytest',
                    self.automation_test.file_path,
                    '-v'
                ],
                cwd=str(self.repo_path),
                capture_output=True,
                text=True
            )

            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _run_robot(self) -> Dict:
        """Запускает тест с помощью Robot Framework"""
        try:
            output_dir = self.repo_path / 'results'
            output_dir.mkdir(exist_ok=True)
            
            result = subprocess.run(
                [
                    'robot',
                    '--outputdir', str(output_dir),
                    '--output', 'output.xml',
                    '--report', 'report.html',
                    '--log', 'log.html',
                    self.automation_test.file_path
                ],
                cwd=str(self.repo_path),
                capture_output=True,
                text=True
            )

            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'report_dir': str(output_dir)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _run_cypress(self) -> Dict:
        """Запускает тест с помощью Cypress"""
        try:
            result = subprocess.run(
                [
                    'npx',
                    'cypress',
                    'run',
                    '--spec', self.automation_test.file_path,
                    '--reporter', 'json'
                ],
                cwd=str(self.repo_path),
                capture_output=True,
                text=True
            )

            try:
                output = json.loads(result.stdout)
            except:
                output = {'stdout': result.stdout}

            return {
                'success': result.returncode == 0,
                'output': output,
                'error': result.stderr
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _run_playwright(self) -> Dict:
        """Запускает тест с помощью Playwright"""
        try:
            result = subprocess.run(
                [
                    'npx',
                    'playwright',
                    'test',
                    self.automation_test.file_path,
                    '--reporter', 'json'
                ],
                cwd=str(self.repo_path),
                capture_output=True,
                text=True
            )

            try:
                output = json.loads(result.stdout)
            except:
                output = {'stdout': result.stdout}

            return {
                'success': result.returncode == 0,
                'output': output,
                'error': result.stderr
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _process_results(self, results: Dict):
        """Обрабатывает результаты выполнения теста"""
        try:
            # Обновляем TestRun
            self.test_run.status = 'passed' if results['success'] else 'failed'
            self.test_run.save()

            # Обновляем TestReport
            self.test_report.status = 'passed' if results['success'] else 'failed'
            self.test_report.execution_time = timezone.now() - self.test_report.execution_date
            
            if 'error' in results and results['error']:
                self.test_report.comments = results['error']
            
            self.test_report.save()

            # Создаем событие о завершении
            self._create_event(
                'finish',
                'Test execution finished',
                'info' if results['success'] else 'error',
                results
            )

        except Exception as e:
            print(f"Error processing results: {str(e)}")

    def run(self) -> Optional[Dict]:
        """Запускает тест и возвращает результаты"""
        if not self._prepare_environment():
            return None

        # Выбираем подходящий runner в зависимости от фреймворка
        runners = {
            'pytest': self._run_pytest,
            'robot': self._run_robot,
            'cypress': self._run_cypress,
            'playwright': self._run_playwright
        }

        runner = runners.get(self.automation_test.framework)
        if not runner:
            return {
                'success': False,
                'error': f'Unsupported test framework: {self.automation_test.framework}'
            }

        results = runner()
        self._process_results(results)
        return results

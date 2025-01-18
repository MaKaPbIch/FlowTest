from django.core.management.base import BaseCommand
from FlowTestApp.models import TestCase, TestRun, TestReport, TestEvent

class Command(BaseCommand):
    help = 'Check test execution results in database'

    def handle(self, *args, **options):
        # Получаем последний тест-кейс
        test_case = TestCase.objects.last()
        if not test_case:
            self.stdout.write(self.style.ERROR('No test cases found'))
            return

        self.stdout.write(f'\nTest Case: {test_case.title}')
        self.stdout.write(f'Framework: {test_case.framework}')
        self.stdout.write(f'Script Path: {test_case.script_path}')

        # Проверяем TestRun
        test_runs = TestRun.objects.filter(test_case=test_case)
        self.stdout.write(f'\nTest Runs ({test_runs.count()}):')
        for run in test_runs:
            self.stdout.write(f'- Status: {run.status}, Run at: {run.run_at}')

        # Проверяем TestReport
        test_reports = TestReport.objects.filter(test_case=test_case)
        self.stdout.write(f'\nTest Reports ({test_reports.count()}):')
        for report in test_reports:
            self.stdout.write(f'- Status: {report.status}')
            self.stdout.write(f'  Execution Date: {report.execution_date}')
            self.stdout.write(f'  Execution Time: {report.execution_time}')
            if report.comments:
                self.stdout.write(f'  Comments: {report.comments}')

        # Проверяем TestEvent
        test_events = TestEvent.objects.filter(test_case=test_case)
        self.stdout.write(f'\nTest Events ({test_events.count()}):')
        for event in test_events:
            self.stdout.write(f'- Type: {event.event_type}')
            self.stdout.write(f'  Description: {event.description}')
            self.stdout.write(f'  Severity: {event.severity}')
            self.stdout.write(f'  Timestamp: {event.timestamp}')

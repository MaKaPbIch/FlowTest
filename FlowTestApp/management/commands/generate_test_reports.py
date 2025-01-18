from django.core.management.base import BaseCommand
from FlowTestApp.models import TestCase, TestReport, CustomUser
from django.utils import timezone
import random

class Command(BaseCommand):
    help = 'Generate test reports for test cases'

    def handle(self, *args, **kwargs):
        user = CustomUser.objects.first()
        if not user:
            self.stdout.write(self.style.ERROR('No users found'))
            return

        test_cases = TestCase.objects.all()
        if not test_cases:
            self.stdout.write(self.style.ERROR('No test cases found'))
            return

        for tc in test_cases:
            for i in range(5):  # 5 reports per test case
                status = random.choices(
                    ['passed', 'failed', 'skipped'],
                    weights=[0.7, 0.2, 0.1]
                )[0]
                
                execution_date = timezone.now() - timezone.timedelta(
                    days=random.randint(0, 30)
                )
                
                TestReport.objects.create(
                    test_case=tc,
                    executor=user,
                    status=status,
                    execution_date=execution_date,
                    actual_result=f'Test {status}',
                    environment='Test Environment',
                    execution_time=timezone.timedelta(seconds=random.randint(1, 300))
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created test reports for {test_cases.count()} test cases'
            )
        )

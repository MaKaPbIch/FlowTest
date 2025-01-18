from django.core.management.base import BaseCommand
from FlowTestApp.models import Project, TestCase, AutomationProject, AutomationTest
from FlowTestApp.services.test_runner import TestRunner
from django.utils import timezone
import os

class Command(BaseCommand):
    help = 'Simulates running an automated test from repository'

    def handle(self, *args, **options):
        # 1. Create or get test project
        project, _ = Project.objects.get_or_create(
            name='Test Automation Project',
            defaults={'description': 'Project for testing automation'}
        )
        
        # 2. Create or get automation project (имитация репозитория с тестами)
        automation_project, _ = AutomationProject.objects.get_or_create(
            name='Sample Automation Project',
            project=project,
            defaults={
                'repository_url': 'https://github.com/example/test-repo',
                'repository_type': 'github',
                'branch': 'main',
                'framework': 'pytest',
                'tests_directory': 'tests/',
                'sync_status': 'synced'
            }
        )

        # Создаем директорию для тестов если её нет
        repo_path = f"temp_repos/{project.id}/{hash(automation_project.repository_url)}"
        os.makedirs(repo_path, exist_ok=True)
        
        # Создаем тестовый файл
        test_file_path = f"{repo_path}/test_sample.py"
        with open(test_file_path, 'w') as f:
            f.write('''
def test_sample():
    """
    A simple test that always passes
    """
    print("Running sample test...")
    assert True, "This test should always pass"
    print("Test completed successfully")
''')

        # 3. Create automation test
        automation_test, _ = AutomationTest.objects.get_or_create(
            project=automation_project,
            name='Sample Test',
            defaults={
                'file_path': 'test_sample.py',
                'is_available': True,
                'framework': 'pytest'
            }
        )

        # 4. Create test case
        test_case, _ = TestCase.objects.get_or_create(
            title='Sample Automated Test',
            defaults={
                'description': 'This is a sample automated test case',
                'test_type': 'automated',
                'priority': 'medium',
                'framework': 'pytest',
                'script_path': 'test_sample.py',
                'automation_project': automation_project,
                'steps': '1. Initialize test environment\n2. Run test\n3. Verify results',
                'expected_results': 'Test should pass successfully'
            }
        )

        self.stdout.write(self.style.SUCCESS(f'Created test case: {test_case.title}'))

        # 5. Run the test
        try:
            runner = TestRunner(test_case)
            results = runner.run()
            
            if results:
                status = 'SUCCESS' if results.get('success') else 'FAILED'
                self.stdout.write(self.style.SUCCESS(f'Test execution completed with status: {status}'))
                self.stdout.write(f'Output: {results.get("output", "No output")}')
                if results.get('error'):
                    self.stdout.write(self.style.ERROR(f'Errors: {results["error"]}'))
            else:
                self.stdout.write(self.style.ERROR('Failed to run test'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error running test: {str(e)}'))

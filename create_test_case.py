import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'FlowTest.settings')
django.setup()

from FlowTestApp.models import Project, TestCase, AutomationTest, AutomationProject

# Получаем или создаем проект TestProject
project, _ = Project.objects.get_or_create(name='TestProject')

# Получаем или создаем проект автоматизации
automation_project, _ = AutomationProject.objects.get_or_create(
    project=project,
    name='TestProject Automation',
    repository_url='https://github.com/yourusername/test_repo.git',
    repository_type='github',
    framework='playwright',
    defaults={
        'branch': 'main',
        'tests_directory': 'ui_tests/'
    }
)

# Создаем автоматизированный тест
automation_test = AutomationTest.objects.create(
    project=automation_project,
    name='test_login',
    file_path='ui_tests/test_login.py',
    framework='playwright'
)

# Создаем тест-кейс
test_case = TestCase.objects.create(
    title='Login Test',
    description='Tests the login functionality using Playwright',
    test_type='automated',
    automation_project=automation_project,
    script_path='ui_tests/test_login.py',
    framework='playwright'
)

print(f'Created test case with ID: {test_case.id}')

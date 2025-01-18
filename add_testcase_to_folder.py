import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'FlowTest.settings')
django.setup()

from FlowTestApp.models import Project, TestCase, Folder

# Получаем проект
project = Project.objects.get(name='TestProject')

# Получаем или создаем корневую папку для тестов
root_folder, created = Folder.objects.get_or_create(
    name='UI Tests',
    project=project,
    parent_folder=None,
    defaults={
        'description': 'Automated UI tests'
    }
)

# Получаем тест-кейс с ID 12 и добавляем его в папку
test_case = TestCase.objects.get(id=12)
test_case.folder = root_folder
test_case.save()

print(f'Added test case "{test_case.title}" to folder "{root_folder.name}"')

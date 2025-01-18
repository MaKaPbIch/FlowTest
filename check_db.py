import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'FlowTest.settings')
django.setup()

from FlowTestApp.models import Project, TestCase, Folder, AutomationProject

# Проверяем проект
project = Project.objects.get(name='TestProject')
print("\nProject:")
print(f"ID: {project.id}")
print(f"Name: {project.name}")

# Проверяем папки
print("\nFolders:")
for folder in Folder.objects.filter(project=project):
    print(f"ID: {folder.id}")
    print(f"Name: {folder.name}")
    print(f"Parent: {folder.parent_folder.name if folder.parent_folder else 'None'}")
    print("---")

# Проверяем тест-кейсы
print("\nTest Cases:")
for tc in TestCase.objects.all():
    print(f"ID: {tc.id}")
    print(f"Title: {tc.title}")
    print(f"Folder: {tc.folder.name if tc.folder else 'None'}")
    print(f"Type: {tc.test_type}")
    print(f"Framework: {tc.framework}")
    print("---")

# Проверяем проекты автоматизации
print("\nAutomation Projects:")
for ap in AutomationProject.objects.all():
    print(f"ID: {ap.id}")
    print(f"Name: {ap.name}")
    print(f"Project: {ap.project.name if ap.project else 'None'}")
    print(f"Framework: {ap.framework}")
    print("---")

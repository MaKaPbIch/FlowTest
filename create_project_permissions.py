import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'FlowTest.settings')
django.setup()

from django.contrib.auth.models import Permission as DjangoPermission
from django.contrib.contenttypes.models import ContentType
from FlowTestApp.models import Permission, Role
from django.db import transaction

# Удаляем все существующие права
def clean_all_permissions():
    # Удаляем все стандартные права Django
    DjangoPermission.objects.all().delete()
    
    # Удаляем все кастомные права
    Permission.objects.all().delete()
    print("Все разрешения были удалены.")

# Создаем новые права в соответствии с проектом
def create_project_permissions():
    # Определяем разрешения для управления тестами
    test_permissions = [
        {
            'name': 'Просмотр тест-кейсов',
            'codename': 'view_testcases',
            'description': 'Доступ к просмотру тест-кейсов',
            'category': 'test_management'
        },
        {
            'name': 'Создание тест-кейсов',
            'codename': 'create_testcases',
            'description': 'Возможность создавать новые тест-кейсы',
            'category': 'test_management'
        },
        {
            'name': 'Редактирование тест-кейсов',
            'codename': 'edit_testcases',
            'description': 'Возможность редактировать существующие тест-кейсы',
            'category': 'test_management'
        },
        {
            'name': 'Удаление тест-кейсов',
            'codename': 'delete_testcases',
            'description': 'Возможность удалять тест-кейсы',
            'category': 'test_management'
        },
        {
            'name': 'Запуск тестов',
            'codename': 'run_tests',
            'description': 'Возможность запускать тесты на выполнение',
            'category': 'test_management'
        },
    ]
    
    # Определяем разрешения для управления проектами
    project_permissions = [
        {
            'name': 'Просмотр проектов',
            'codename': 'view_projects',
            'description': 'Доступ к просмотру списка проектов',
            'category': 'project_management'
        },
        {
            'name': 'Создание проектов',
            'codename': 'create_projects',
            'description': 'Возможность создавать новые проекты',
            'category': 'project_management'
        },
        {
            'name': 'Редактирование проектов',
            'codename': 'edit_projects',
            'description': 'Возможность редактировать существующие проекты',
            'category': 'project_management'
        },
        {
            'name': 'Удаление проектов',
            'codename': 'delete_projects',
            'description': 'Возможность удалять проекты',
            'category': 'project_management'
        },
        {
            'name': 'Управление папками',
            'codename': 'manage_folders',
            'description': 'Возможность создавать, редактировать и удалять папки проектов',
            'category': 'project_management'
        },
    ]
    
    # Определяем разрешения для управления расписанием и событиями
    scheduler_permissions = [
        {
            'name': 'Просмотр событий',
            'codename': 'view_events',
            'description': 'Доступ к просмотру календаря и списка событий',
            'category': 'test_management'
        },
        {
            'name': 'Создание обычных событий',
            'codename': 'create_general_events',
            'description': 'Возможность создавать обычные события в календаре',
            'category': 'test_management'
        },
        {
            'name': 'Создание событий запуска тестов',
            'codename': 'create_test_run_events',
            'description': 'Возможность создавать события для запуска тестов по расписанию',
            'category': 'test_management'
        },
        {
            'name': 'Редактирование событий',
            'codename': 'edit_events',
            'description': 'Возможность редактировать созданные события',
            'category': 'test_management'
        },
        {
            'name': 'Удаление событий',
            'codename': 'delete_events',
            'description': 'Возможность удалять события',
            'category': 'test_management'
        },
    ]
    
    # Определяем разрешения для управления отчетами
    report_permissions = [
        {
            'name': 'Просмотр отчетов',
            'codename': 'view_reports',
            'description': 'Доступ к просмотру отчетов и аналитики',
            'category': 'reporting'
        },
        {
            'name': 'Создание отчетов',
            'codename': 'create_reports',
            'description': 'Возможность создавать новые отчеты',
            'category': 'reporting'
        },
        {
            'name': 'Экспорт отчетов',
            'codename': 'export_reports',
            'description': 'Возможность экспортировать отчеты в различные форматы',
            'category': 'reporting'
        },
        {
            'name': 'Управление шаблонами отчетов',
            'codename': 'manage_report_templates',
            'description': 'Возможность создавать и редактировать шаблоны отчетов',
            'category': 'reporting'
        },
    ]
    
    # Определяем разрешения для управления пользователями
    user_permissions = [
        {
            'name': 'Просмотр пользователей',
            'codename': 'view_users',
            'description': 'Доступ к просмотру списка пользователей',
            'category': 'user_management'
        },
        {
            'name': 'Создание пользователей',
            'codename': 'create_users',
            'description': 'Возможность создавать новых пользователей',
            'category': 'user_management'
        },
        {
            'name': 'Редактирование пользователей',
            'codename': 'edit_users',
            'description': 'Возможность редактировать данные пользователей',
            'category': 'user_management'
        },
        {
            'name': 'Управление ролями',
            'codename': 'manage_roles',
            'description': 'Возможность управлять ролями и правами доступа',
            'category': 'user_management'
        },
    ]
    
    # Определяем разрешения для администрирования
    admin_permissions = [
        {
            'name': 'Доступ к админ-панели',
            'codename': 'access_admin_panel',
            'description': 'Доступ к административной панели',
            'category': 'admin'
        },
        {
            'name': 'Управление системными настройками',
            'codename': 'manage_system_settings',
            'description': 'Возможность изменять системные настройки',
            'category': 'admin'
        },
        {
            'name': 'Просмотр системных логов',
            'codename': 'view_logs',
            'description': 'Доступ к просмотру системных логов',
            'category': 'admin'
        },
    ]
    
    # Определяем разрешения для управления автоматизацией
    automation_permissions = [
        {
            'name': 'Управление репозиториями',
            'codename': 'manage_repositories',
            'description': 'Возможность управлять репозиториями автотестов',
            'category': 'test_management'
        },
        {
            'name': 'Синхронизация тестов',
            'codename': 'sync_tests',
            'description': 'Возможность синхронизировать тесты с репозиторием',
            'category': 'test_management'
        },
        {
            'name': 'Просмотр результатов автотестов',
            'codename': 'view_test_results',
            'description': 'Доступ к просмотру результатов автоматизированных тестов',
            'category': 'test_management'
        },
    ]
    
    # Объединяем все разрешения
    all_permissions = (
        test_permissions +
        project_permissions +
        scheduler_permissions +
        report_permissions +
        user_permissions +
        admin_permissions +
        automation_permissions
    )
    
    # Создаем разрешения в базе данных
    created_permissions = []
    for perm_data in all_permissions:
        permission = Permission.objects.create(
            name=perm_data['name'],
            codename=perm_data['codename'],
            description=perm_data['description'],
            category=perm_data['category']
        )
        created_permissions.append(permission)
        print(f"Создано разрешение: {permission.name} ({permission.codename})")
    
    return created_permissions

# Создаем роли и назначаем им разрешения
def create_roles(permissions):
    # Очищаем существующие роли
    Role.objects.all().delete()
    print("Существующие роли удалены")
    
    # Создаем роль администратора
    admin_role = Role.objects.create(
        name="Администратор",
        description="Полный доступ ко всем функциям системы",
        is_admin_role=True
    )
    
    # Добавляем все разрешения
    admin_role.permissions.set(permissions)
    print(f"Создана роль: {admin_role.name} с {admin_role.permissions.count()} разрешениями")
    
    # Создаем роль менеджера проектов
    project_manager_role = Role.objects.create(
        name="Менеджер проектов",
        description="Управление проектами и тест-кейсами",
        is_admin_role=False
    )
    
    # Добавляем разрешения для менеджера проектов
    project_manager_permissions = Permission.objects.filter(
        codename__in=[
            'view_testcases', 'create_testcases', 'edit_testcases', 
            'view_projects', 'create_projects', 'edit_projects', 'manage_folders',
            'view_events', 'create_general_events', 'create_test_run_events', 'edit_events',
            'view_reports', 'create_reports', 'export_reports',
            'run_tests', 'view_test_results'
        ]
    )
    project_manager_role.permissions.set(project_manager_permissions)
    print(f"Создана роль: {project_manager_role.name} с {project_manager_role.permissions.count()} разрешениями")
    
    # Создаем роль тестировщика
    tester_role = Role.objects.create(
        name="Тестировщик",
        description="Работа с тест-кейсами и выполнение тестов",
        is_admin_role=False
    )
    
    # Добавляем разрешения для тестировщика
    tester_permissions = Permission.objects.filter(
        codename__in=[
            'view_testcases', 'create_testcases', 'edit_testcases', 
            'view_projects', 
            'view_events', 'create_general_events',
            'view_reports', 'export_reports',
            'run_tests', 'view_test_results'
        ]
    )
    tester_role.permissions.set(tester_permissions)
    print(f"Создана роль: {tester_role.name} с {tester_role.permissions.count()} разрешениями")
    
    # Создаем роль наблюдателя
    observer_role = Role.objects.create(
        name="Наблюдатель",
        description="Только просмотр информации без возможности изменения",
        is_admin_role=False
    )
    
    # Добавляем разрешения для наблюдателя
    observer_permissions = Permission.objects.filter(
        codename__in=[
            'view_testcases',
            'view_projects',
            'view_events',
            'view_reports',
            'view_test_results'
        ]
    )
    observer_role.permissions.set(observer_permissions)
    print(f"Создана роль: {observer_role.name} с {observer_role.permissions.count()} разрешениями")
    
    return [admin_role, project_manager_role, tester_role, observer_role]

if __name__ == "__main__":
    with transaction.atomic():
        print("Начало установки разрешений и ролей...")
        # Удаляем все разрешения
        clean_all_permissions()
        
        # Создаем новые разрешения
        permissions = create_project_permissions()
        
        # Создаем роли
        roles = create_roles(permissions)
        
        print("\nУстановка разрешений и ролей завершена успешно!")
        print(f"Создано {len(permissions)} разрешений и {len(roles)} ролей.")
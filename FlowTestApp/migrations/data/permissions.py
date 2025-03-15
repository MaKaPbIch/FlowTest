"""
Файл с определением разрешений для системы FlowTest
"""

# Список разрешений для системы, сгруппированных по категориям
PERMISSIONS = [
    # Управление пользователями
    {
        'name': 'Просмотр пользователей',
        'codename': 'view_users',
        'description': 'Право на просмотр списка пользователей системы',
        'category': 'user_management',
    },
    {
        'name': 'Создание пользователей',
        'codename': 'create_users',
        'description': 'Право на создание новых пользователей',
        'category': 'user_management',
    },
    {
        'name': 'Редактирование пользователей',
        'codename': 'edit_users',
        'description': 'Право на редактирование данных пользователей',
        'category': 'user_management',
    },
    {
        'name': 'Управление ролями',
        'codename': 'manage_roles',
        'description': 'Право на управление ролями пользователей',
        'category': 'user_management',
    },
    
    # Управление проектами
    {
        'name': 'Просмотр проектов',
        'codename': 'view_projects',
        'description': 'Право на просмотр списка проектов и их детальной информации',
        'category': 'project_management',
    },
    {
        'name': 'Создание проектов',
        'codename': 'create_projects',
        'description': 'Право на создание новых проектов',
        'category': 'project_management',
    },
    {
        'name': 'Редактирование проектов',
        'codename': 'edit_projects',
        'description': 'Право на редактирование проектов',
        'category': 'project_management',
    },
    {
        'name': 'Архивирование проектов',
        'codename': 'archive_projects',
        'description': 'Право на архивирование и восстановление проектов',
        'category': 'project_management',
    },
    {
        'name': 'Управление папками',
        'codename': 'manage_folders',
        'description': 'Право на создание и управление папками внутри проектов',
        'category': 'project_management',
    },
    {
        'name': 'Управление участниками проекта',
        'codename': 'manage_project_members',
        'description': 'Право на добавление/удаление участников проекта',
        'category': 'project_management',
    },
    
    # Управление тестами
    {
        'name': 'Просмотр тест-кейсов',
        'codename': 'view_testcases',
        'description': 'Право на просмотр тест-кейсов',
        'category': 'test_management',
    },
    {
        'name': 'Создание тест-кейсов',
        'codename': 'create_testcases',
        'description': 'Право на создание новых тест-кейсов',
        'category': 'test_management',
    },
    {
        'name': 'Редактирование тест-кейсов',
        'codename': 'edit_testcases',
        'description': 'Право на редактирование существующих тест-кейсов',
        'category': 'test_management',
    },
    {
        'name': 'Удаление тест-кейсов',
        'codename': 'delete_testcases',
        'description': 'Право на удаление тест-кейсов',
        'category': 'test_management',
    },
    {
        'name': 'Запуск тестов',
        'codename': 'run_tests',
        'description': 'Право на ручной запуск тестов',
        'category': 'test_management',
    },
    {
        'name': 'Просмотр тест-ранов',
        'codename': 'view_testruns',
        'description': 'Право на просмотр истории запусков тестов',
        'category': 'test_management',
    },
    
    # Управление отчетами
    {
        'name': 'Просмотр отчетов',
        'codename': 'view_reports',
        'description': 'Право на просмотр отчетов по тестированию',
        'category': 'report_management',
    },
    {
        'name': 'Создание отчетов',
        'codename': 'create_reports',
        'description': 'Право на создание новых отчетов',
        'category': 'report_management',
    },
    {
        'name': 'Экспорт отчетов',
        'codename': 'export_reports',
        'description': 'Право на экспорт отчетов в различных форматах',
        'category': 'report_management',
    },
    {
        'name': 'Управление шаблонами отчетов',
        'codename': 'manage_report_templates',
        'description': 'Право на создание и редактирование шаблонов отчетов',
        'category': 'report_management',
    },
    {
        'name': 'Управление графиками',
        'codename': 'manage_charts',
        'description': 'Право на создание и настройку пользовательских графиков',
        'category': 'report_management',
    },
    
    # Управление событиями
    {
        'name': 'Просмотр событий',
        'codename': 'view_events',
        'description': 'Право на просмотр событий календаря',
        'category': 'event_management',
    },
    {
        'name': 'Создание событий',
        'codename': 'create_events',
        'description': 'Право на создание новых событий',
        'category': 'event_management',
    },
    {
        'name': 'Редактирование событий',
        'codename': 'edit_events',
        'description': 'Право на редактирование существующих событий',
        'category': 'event_management',
    },
    {
        'name': 'Удаление событий',
        'codename': 'delete_events',
        'description': 'Право на удаление событий',
        'category': 'event_management',
    },
    {
        'name': 'Планирование запусков тестов',
        'codename': 'schedule_test_runs',
        'description': 'Право на планирование запусков тестов по расписанию',
        'category': 'event_management',
    },
    
    # Управление автоматизацией
    {
        'name': 'Просмотр проектов автоматизации',
        'codename': 'view_automation_projects',
        'description': 'Право на просмотр проектов автоматизации',
        'category': 'automation_management',
    },
    {
        'name': 'Создание проектов автоматизации',
        'codename': 'create_automation_projects',
        'description': 'Право на создание новых проектов автоматизации',
        'category': 'automation_management',
    },
    {
        'name': 'Подключение репозиториев',
        'codename': 'connect_repositories',
        'description': 'Право на подключение внешних репозиториев кода',
        'category': 'automation_management',
    },
    {
        'name': 'Управление скриптами автоматизации',
        'codename': 'manage_automation_scripts',
        'description': 'Право на управление скриптами автоматизации',
        'category': 'automation_management',
    },
    {
        'name': 'Выполнение автоматизированных тестов',
        'codename': 'run_automation_tests',
        'description': 'Право на запуск автоматизированных тестов',
        'category': 'automation_management',
    },
    {
        'name': 'Просмотр результатов автоматизации',
        'codename': 'view_automation_results',
        'description': 'Право на просмотр результатов выполнения автоматизированных тестов',
        'category': 'automation_management',
    },
]

# Предопределенные роли системы
DEFAULT_ROLES = [
    {
        'name': 'Администратор',
        'description': 'Полный доступ ко всем функциям системы',
        'is_admin_role': True,
        'permissions': '*',  # Все разрешения
    },
    {
        'name': 'Менеджер проектов',
        'description': 'Управление проектами и их участниками',
        'is_admin_role': False,
        'permissions': [
            'view_users', 'view_projects', 'create_projects', 'edit_projects', 
            'archive_projects', 'manage_folders', 'manage_project_members',
            'view_testcases', 'view_testruns', 'view_reports', 'create_reports', 
            'export_reports', 'view_events', 'create_events', 'edit_events', 
            'view_automation_projects', 'view_automation_results',
        ],
    },
    {
        'name': 'Тест-менеджер',
        'description': 'Управление тестами и их выполнением',
        'is_admin_role': False,
        'permissions': [
            'view_projects', 'manage_folders', 'view_testcases', 'create_testcases', 
            'edit_testcases', 'run_tests', 'view_testruns', 'view_reports', 
            'create_reports', 'export_reports', 'view_events', 'create_events', 
            'schedule_test_runs', 'view_automation_projects',
        ],
    },
    {
        'name': 'Тестировщик',
        'description': 'Создание и выполнение тестов',
        'is_admin_role': False,
        'permissions': [
            'view_projects', 'view_testcases', 'create_testcases', 'edit_testcases', 
            'run_tests', 'view_testruns', 'view_reports', 'view_events',
        ],
    },
    {
        'name': 'Автоматизатор',
        'description': 'Разработка и запуск автоматизированных тестов',
        'is_admin_role': False,
        'permissions': [
            'view_projects', 'view_testcases', 'create_testcases', 'edit_testcases', 
            'run_tests', 'view_testruns', 'view_reports', 'view_events',
            'view_automation_projects', 'create_automation_projects', 
            'connect_repositories', 'manage_automation_scripts', 
            'run_automation_tests', 'view_automation_results',
        ],
    },
    {
        'name': 'Наблюдатель',
        'description': 'Только просмотр информации',
        'is_admin_role': False,
        'permissions': [
            'view_projects', 'view_testcases', 'view_testruns',
            'view_reports', 'view_events', 'view_automation_projects',
        ],
    },
]
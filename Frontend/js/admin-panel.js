// Admin Panel Manager
let currentUsers = [];
let currentRoles = [];
let currentPermissions = [];

// Функция для удаления дубликатов из массива объектов по указанному ключу
function removeDuplicates(array, key) {
    if (!array || !Array.isArray(array)) {
        return [];
    }
    return Array.from(new Map(array.map(item => [item[key], item])).values());
}

// Load permissions from API
async function loadPermissions() {
    console.log('Loading permissions - debug info');
    
    try {
        // Use the correct API endpoint with config
        const permissionsEndpoint = `${config.API_BASE_URL}${config.API_PREFIX}/permissions/`;
        console.log('Permissions API endpoint:', permissionsEndpoint);
        
        const response = await fetchWithAuth(permissionsEndpoint);
        console.log('Permission API response status:', response.status, response.statusText);
        
        if (!response.ok) {
            console.error('API response not OK:', response.status, response.statusText);
            let errorMessage = response.statusText;
            try {
                const responseText = await response.text();
                if (responseText) {
                    console.error('Error response body:', responseText);
                    errorMessage = responseText;
                }
            } catch (e) {
                console.error('Failed to read error response text:', e);
            }
            
            // Check if API endpoint exists
            if (response.status === 404) {
                console.warn('Permissions endpoint not found, creating initial permissions');
                // Create initial permissions as this might be first time setup
                await createInitialPermissions();
                return;
            }
            throw new Error(`Failed to fetch permissions: Status ${response.status} - ${errorMessage}`);
        }
        
        const permissions = await response.json();
        console.log('Permissions loaded from API:', permissions);
        
        if (!permissions || !Array.isArray(permissions)) {
            console.error('Invalid permissions data format:', permissions);
            throw new Error('Invalid permissions data format');
        }
        
        // Store permissions for global use
        currentPermissions = permissions;
        
        // Render permissions
        renderPermissionsGrid(permissions);
        
        // Initialize category filter
        populateCategoryFilter(permissions);
        
        // Initialize search and filter functionality
        initPermissionSearchFilter();
        
        console.log('Permissions loaded and processed successfully');
    } catch (error) {
        console.error('Error loading permissions:', error);
        console.error('Error details:', error.message);
        document.getElementById('permissionsContainer').innerHTML = `
            <div class="col-span-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center justify-center">
                <span class="text-red-500">Ошибка загрузки разрешений: ${error.message}</span>
            </div>
        `;
        
        // Используем моковые данные для разработки
        console.log('Using mock permission data due to API error');
        const mockData = mockPermissions();
        currentPermissions = mockData;
        
        // Render permissions grid with mock data
        renderPermissionsGrid(mockData);
        
        // Populate category filter with mock data
        populateCategoryFilter(mockData);
        
        // Initialize search and filter functionality
        initPermissionSearchFilter();
    }
}

// Create initial permissions if they don't exist
async function createInitialPermissions() {
    const initialPermissions = [
        // Управление пользователями
        { name: 'Просмотр пользователей', codename: 'view_users', category: 'user_management', description: 'Просмотр списка и деталей пользователей' },
        { name: 'Добавление пользователей', codename: 'add_users', category: 'user_management', description: 'Создание новых пользователей' },
        { name: 'Редактирование пользователей', codename: 'edit_users', category: 'user_management', description: 'Редактирование существующих пользователей' },
        { name: 'Удаление пользователей', codename: 'delete_users', category: 'user_management', description: 'Удаление пользователей' },
        
        // Управление тест-кейсами
        { name: 'Просмотр тест-кейсов', codename: 'view_testcases', category: 'test_management', description: 'Просмотр тест-кейсов и их деталей' },
        { name: 'Создание тест-кейсов', codename: 'create_testcases', category: 'test_management', description: 'Создание новых тест-кейсов' },
        { name: 'Редактирование тест-кейсов', codename: 'edit_testcases', category: 'test_management', description: 'Редактирование существующих тест-кейсов' },
        { name: 'Удаление тест-кейсов', codename: 'delete_testcases', category: 'test_management', description: 'Удаление тест-кейсов' },
        { name: 'Запуск тест-кейсов', codename: 'run_testcases', category: 'test_management', description: 'Запуск тестов на выполнение' },
        
        // Управление папками
        { name: 'Просмотр папок', codename: 'view_folders', category: 'test_management', description: 'Просмотр папок с тест-кейсами' },
        { name: 'Создание папок', codename: 'create_folders', category: 'test_management', description: 'Создание новых папок' },
        { name: 'Редактирование папок', codename: 'edit_folders', category: 'test_management', description: 'Редактирование папок' },
        { name: 'Удаление папок', codename: 'delete_folders', category: 'test_management', description: 'Удаление папок' },
        
        // Управление тестовыми запусками
        { name: 'Просмотр тестовых запусков', codename: 'view_testruns', category: 'test_execution', description: 'Просмотр истории и результатов запусков тестов' },
        { name: 'Создание тестовых запусков', codename: 'create_testruns', category: 'test_execution', description: 'Создание новых запусков тестов' },
        { name: 'Остановка тестовых запусков', codename: 'stop_testruns', category: 'test_execution', description: 'Остановка выполнения тестов' },
        
        // Отчетность
        { name: 'Просмотр отчетов', codename: 'view_reports', category: 'reporting', description: 'Просмотр отчетов по тестированию' },
        { name: 'Создание отчетов', codename: 'create_reports', category: 'reporting', description: 'Создание новых отчетов' },
        { name: 'Экспорт отчетов', codename: 'export_reports', category: 'reporting', description: 'Экспорт отчетов в различные форматы' },
        
        // Работа с проектами
        { name: 'Просмотр проектов', codename: 'view_projects', category: 'project_management', description: 'Просмотр списка проектов' },
        { name: 'Создание проектов', codename: 'create_projects', category: 'project_management', description: 'Создание новых проектов' },
        { name: 'Редактирование проектов', codename: 'edit_projects', category: 'project_management', description: 'Редактирование проектов' },
        { name: 'Удаление проектов', codename: 'delete_projects', category: 'project_management', description: 'Удаление проектов' },
        
        // Календарь и события
        { name: 'Просмотр календаря', codename: 'view_calendar', category: 'scheduling', description: 'Просмотр календаря событий' },
        { name: 'Добавление событий', codename: 'add_events', category: 'scheduling', description: 'Добавление новых событий в календарь' },
        { name: 'Редактирование событий', codename: 'edit_events', category: 'scheduling', description: 'Редактирование событий в календаре' },
        { name: 'Удаление событий', codename: 'delete_events', category: 'scheduling', description: 'Удаление событий из календаря' },
        
        // Автоматизация
        { name: 'Управление автоматизацией', codename: 'manage_automation', category: 'automation', description: 'Работа с автоматизированными тестами' },
        { name: 'Настройка интеграций', codename: 'configure_integrations', category: 'automation', description: 'Настройка интеграций с внешними системами' }
    ];
    
    try {
        // Create permissions one by one
        const createdPermissions = [];
        const permissionsEndpoint = `${config.API_BASE_URL}${config.API_PREFIX}/permissions/`;
        console.log('Creating initial permissions at endpoint:', permissionsEndpoint);
        
        for (const permission of initialPermissions) {
            const response = await fetchWithAuth(permissionsEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(permission)
            });
            
            if (response.ok) {
                const createdPermission = await response.json();
                createdPermissions.push(createdPermission);
            } else {
                console.error(`Failed to create permission ${permission.name}: ${response.status}`);
            }
        }
        
        currentPermissions = createdPermissions;
        renderPermissionsGrid(createdPermissions);
        populateCategoryFilter(createdPermissions);
        initPermissionSearchFilter();
        
        console.log(`Created ${createdPermissions.length} permissions successfully`);
    } catch (error) {
        console.error('Error creating initial permissions:', error);
        document.getElementById('permissionsContainer').innerHTML = `
            <div class="col-span-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center justify-center">
                <span class="text-red-500">Error creating permissions: ${error.message}</span>
            </div>
        `;
    }
}

// Generate mock permission data for testing when API is unavailable
function mockPermissions() {
    console.log('Using mock permissions data for development');
    const mockData = [
        // Управление пользователями
        { id: '1', name: 'Просмотр пользователей', codename: 'view_users', category: 'user_management', description: 'Просмотр списка и деталей пользователей' },
        { id: '2', name: 'Добавление пользователей', codename: 'add_users', category: 'user_management', description: 'Создание новых пользователей' },
        { id: '3', name: 'Редактирование пользователей', codename: 'edit_users', category: 'user_management', description: 'Редактирование существующих пользователей' },
        { id: '4', name: 'Удаление пользователей', codename: 'delete_users', category: 'user_management', description: 'Удаление пользователей' },
        
        // Управление тест-кейсами
        { id: '5', name: 'Просмотр тест-кейсов', codename: 'view_testcases', category: 'test_management', description: 'Просмотр тест-кейсов и их деталей' },
        { id: '6', name: 'Создание тест-кейсов', codename: 'create_testcases', category: 'test_management', description: 'Создание новых тест-кейсов' },
        { id: '7', name: 'Редактирование тест-кейсов', codename: 'edit_testcases', category: 'test_management', description: 'Редактирование существующих тест-кейсов' },
        { id: '8', name: 'Удаление тест-кейсов', codename: 'delete_testcases', category: 'test_management', description: 'Удаление тест-кейсов' },
        { id: '9', name: 'Запуск тест-кейсов', codename: 'run_testcases', category: 'test_management', description: 'Запуск тестов на выполнение' },
        { id: '10', name: 'Экспорт тест-кейсов', codename: 'export_testcases', category: 'test_management', description: 'Экспорт тест-кейсов в различные форматы' },
        { id: '11', name: 'Импорт тест-кейсов', codename: 'import_testcases', category: 'test_management', description: 'Импорт тест-кейсов из файлов' },
        
        // Управление папками
        { id: '12', name: 'Просмотр папок', codename: 'view_folders', category: 'test_management', description: 'Просмотр папок с тест-кейсами' },
        { id: '13', name: 'Создание папок', codename: 'create_folders', category: 'test_management', description: 'Создание новых папок' },
        { id: '14', name: 'Редактирование папок', codename: 'edit_folders', category: 'test_management', description: 'Редактирование папок' },
        { id: '15', name: 'Удаление папок', codename: 'delete_folders', category: 'test_management', description: 'Удаление папок' },
        
        // Тестовые запуски
        { id: '16', name: 'Просмотр тестовых запусков', codename: 'view_testruns', category: 'test_execution', description: 'Просмотр истории и результатов запусков тестов' },
        { id: '17', name: 'Создание тестовых запусков', codename: 'create_testruns', category: 'test_execution', description: 'Создание новых запусков тестов' },
        { id: '18', name: 'Управление тестовыми запусками', codename: 'manage_testruns', category: 'test_execution', description: 'Остановка, перезапуск и другие операции с тестами' },
        { id: '19', name: 'Анализ результатов тестов', codename: 'analyze_results', category: 'test_execution', description: 'Доступ к детальному анализу результатов тестирования' },
        
        // Отчетность
        { id: '20', name: 'Просмотр отчетов', codename: 'view_reports', category: 'reporting', description: 'Просмотр отчетов по тестированию' },
        { id: '21', name: 'Создание отчетов', codename: 'create_reports', category: 'reporting', description: 'Создание новых отчетов' },
        { id: '22', name: 'Экспорт отчетов', codename: 'export_reports', category: 'reporting', description: 'Экспорт отчетов в различные форматы' },
        { id: '23', name: 'Настройка шаблонов отчетов', codename: 'manage_report_templates', category: 'reporting', description: 'Создание и редактирование шаблонов отчетов' },
        
        // Проекты
        { id: '24', name: 'Просмотр проектов', codename: 'view_projects', category: 'project_management', description: 'Просмотр списка проектов' },
        { id: '25', name: 'Создание проектов', codename: 'create_projects', category: 'project_management', description: 'Создание новых проектов' },
        { id: '26', name: 'Редактирование проектов', codename: 'edit_projects', category: 'project_management', description: 'Редактирование проектов' },
        { id: '27', name: 'Удаление проектов', codename: 'delete_projects', category: 'project_management', description: 'Удаление проектов' },
        { id: '28', name: 'Управление участниками проекта', codename: 'manage_project_members', category: 'project_management', description: 'Добавление и удаление участников проекта' },
        
        // Планирование и события
        { id: '29', name: 'Просмотр календаря', codename: 'view_calendar', category: 'scheduling', description: 'Просмотр календаря событий' },
        { id: '30', name: 'Управление событиями', codename: 'manage_events', category: 'scheduling', description: 'Добавление, редактирование и удаление событий' },
        { id: '31', name: 'Планирование запусков', codename: 'schedule_tests', category: 'scheduling', description: 'Планирование автоматического запуска тестов по расписанию' },
        
        // Автоматизация
        { id: '32', name: 'Доступ к автоматизации', codename: 'access_automation', category: 'automation', description: 'Базовый доступ к функциям автоматизации' },
        { id: '33', name: 'Управление репозиториями', codename: 'manage_repositories', category: 'automation', description: 'Подключение и настройка Git-репозиториев' },
        { id: '34', name: 'Редактирование тестовых скриптов', codename: 'edit_test_scripts', category: 'automation', description: 'Создание и редактирование скриптов автоматизации' },
        { id: '35', name: 'Настройка CI/CD интеграций', codename: 'manage_ci_integrations', category: 'automation', description: 'Настройка интеграций с CI/CD системами' },
        
        // Дашборды и аналитика
        { id: '36', name: 'Просмотр дашбордов', codename: 'view_dashboards', category: 'analytics', description: 'Доступ к аналитическим дашбордам' },
        { id: '37', name: 'Настройка дашбордов', codename: 'customize_dashboards', category: 'analytics', description: 'Создание и настройка пользовательских дашбордов' },
        { id: '38', name: 'Экспорт аналитики', codename: 'export_analytics', category: 'analytics', description: 'Экспорт аналитических данных' }
    ];
    
    // Сразу отображаем данные на интерфейсе
    console.log('Mock data generated:', mockData.length, 'permissions');
    return mockData;
}

// Render permissions in a grid view
function renderPermissionsGrid(permissions) {
    const container = document.getElementById('permissionsContainer');
    
    if (!container) {
        console.error('Permissions container not found');
        return;
    }
    
    // Используем доступный контейнер
    const targetContainer = container;

    console.log('Rendering permissions grid with', permissions ? permissions.length : 0, 'permissions');
    
    // Clear existing content
    if (container) {
        container.innerHTML = '';
    }

    if (!permissions || permissions.length === 0) {
        console.log('No permissions to display, showing empty message');
        
        // Если на сервере нет разрешений, используем моковые данные
        console.log('Using mock data instead since permissions array is empty');
        const mockData = mockPermissions();
        currentPermissions = mockData;
        
        // Group permissions by category
        const permissionsByCategory = {};
        mockData.forEach(permission => {
            const category = permission.category || 'other';
            if (!permissionsByCategory[category]) {
                permissionsByCategory[category] = [];
            }
            permissionsByCategory[category].push(permission);
        });
        
        // Создаем HTML для карточек разрешений
        let permissionCardsHTML = '';
        
        // Create and add permission cards by category
        Object.entries(permissionsByCategory).forEach(([category, categoryPermissions]) => {
            const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
            
            categoryPermissions.forEach(permission => {
                permissionCardsHTML += `
                    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-medium text-gray-900 dark:text-white truncate" title="${permission.name}">${permission.name}</h3>
                            <div class="flex space-x-2">
                                <button class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" onclick="editPermission('${permission.id}')" title="${window.i18n?.t('edit') || 'Редактировать'}">
                                    <i class="ri-edit-line"></i>
                                </button>
                                <button class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" onclick="showDeleteModal('${permission.id}', 'permission', '${permission.name}')" title="${window.i18n?.t('delete') || 'Удалить'}">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            <span class="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-200">
                                ${categoryTitle}
                            </span>
                            <span class="ml-2 font-mono">${permission.codename}</span>
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2" title="${permission.description || ''}">
                            ${permission.description || (window.i18n?.t('noDescription') || 'Нет описания')}
                        </p>
                    </div>
                `;
            });
        });
        
        // Добавляем карточки в контейнер
        if (container) {
            container.innerHTML = permissionCardsHTML;
        }
        
        // Заполняем фильтр категорий
        populateCategoryFilter(mockData);
        
        return;
    }

    // Group permissions by category
    const permissionsByCategory = {};
    permissions.forEach(permission => {
        const category = permission.category || 'other';
        if (!permissionsByCategory[category]) {
            permissionsByCategory[category] = [];
        }
        permissionsByCategory[category].push(permission);
    });

    // Создаем HTML для карточек разрешений
    let permissionCardsHTML = '';
    
    // Create and add permission cards by category
    Object.entries(permissionsByCategory).forEach(([category, categoryPermissions]) => {
        const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
        
        categoryPermissions.forEach(permission => {
            permissionCardsHTML += `
                <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-medium text-gray-900 dark:text-white truncate" title="${permission.name}">${permission.name}</h3>
                        <div class="flex space-x-2">
                            <button class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" onclick="editPermission('${permission.id}')" title="${window.i18n?.t('edit') || 'Редактировать'}">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" onclick="showDeleteModal('${permission.id}', 'permission', '${permission.name}')" title="${window.i18n?.t('delete') || 'Удалить'}">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span class="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-200">
                            ${categoryTitle}
                        </span>
                        <span class="ml-2 font-mono">${permission.codename}</span>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2" title="${permission.description || ''}">
                        ${permission.description || (window.i18n?.t('noDescription') || 'Нет описания')}
                    </p>
                </div>
            `;
        });
    });
    
    // Добавляем карточки в контейнер
    if (container) {
        container.innerHTML = permissionCardsHTML;
    }
}

// Populate category filter dropdown
function populateCategoryFilter(permissions) {
    const select = document.getElementById('categoryFilter');
    if (!select) {
        console.error('Category filter not found');
        return;
    }

    // Get unique categories
    const categories = [...new Set(permissions.map(p => p.category || 'other'))];

    // Clear existing options except first one
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Add category options
    categories.sort().forEach(category => {
        const displayName = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
        const option = new Option(displayName, category);
        select.add(option);
    });
}

// Filter permissions based on search text and category
function filterPermissions() {
    const searchText = document.getElementById('permissionSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;

    const filteredPermissions = currentPermissions.filter(permission => {
        const matchesSearch = 
            permission.name.toLowerCase().includes(searchText) || 
            permission.codename.toLowerCase().includes(searchText) || 
            (permission.description || '').toLowerCase().includes(searchText);
        
        const matchesCategory = !categoryFilter || permission.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });

    renderPermissionsGrid(filteredPermissions);
}

// Initialize search and filter for permissions
function initPermissionSearchFilter() {
    const searchInput = document.getElementById('permissionSearch');
    const categoryFilter = document.getElementById('categoryFilter');

    if (searchInput) {
        searchInput.addEventListener('input', filterPermissions);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterPermissions);
    }
}

// Delete permission
async function deletePermission(permissionId) {
    try {
        const response = await fetchWithAuth(`/permissions/${permissionId}/`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to delete permission: ${response.status}`);
        }
        
        // Reload permissions
        await loadPermissions();
        
        // Show success message
        showNotification('Permission deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting permission:', error);
        showNotification(`Error deleting permission: ${error.message}`, 'error');
        throw error;
    }
}

// Edit permission - global function called from permission card
function editPermission(permissionId) {
    showPermissionModal(permissionId);
}

// Функция для отображения модального окна удаления
function showDeleteModal(id, type, name) {
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const deleteModalText = document.getElementById('deleteModalText');
    
    if (!modal || !confirmBtn) {
        console.error('Delete modal elements not found');
        return;
    }

    // Устанавливаем текст с описанием элемента для удаления
    if (deleteModalText) {
        deleteModalText.textContent = `Вы действительно хотите удалить ${name || 'выбранный элемент'}? Это действие нельзя отменить.`;
    }
    
    // Показываем модальное окно
    modal.classList.remove('hidden');
    
    // Обработчик отмены
    const cancelHandler = () => {
        // Удаляем обработчики
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        
        // Скрываем модальное окно
        modal.classList.add('hidden');
    };
    
    // Обработчик подтверждения удаления
    const confirmHandler = () => {
        // Удаляем обработчики
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        
        // Скрываем модальное окно
        modal.classList.add('hidden');
        
        // Выполняем удаление в зависимости от типа
        if (type === 'user') {
            deleteUser(id);
        } else if (type === 'role') {
            deleteRole(id);
        } else if (type === 'permission') {
            deletePermission(id);
        }
    };
    
    // Добавляем обработчики
    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', cancelHandler);
}

window.showDeleteModal = showDeleteModal;

// Добавляем функцию редактирования роли
function editRole(roleId) {
    console.log('Editing role with ID:', roleId);
    // Загружаем информацию о роли для формы
    showRoleModal(roleId);
}

// Функция для отображения модального окна роли
function showRoleModal(roleId = null) {
    console.log('Showing role modal for roleId:', roleId);
    
    const modal = document.getElementById('roleModal');
    const form = document.getElementById('roleForm');
    const titleEl = document.getElementById('roleModalTitle');
    
    if (!modal) {
        console.error('Role modal not found');
        return;
    }
    
    // Сброс формы
    if (form) {
        form.reset();
    }
    
    // Загрузим разрешения, если они еще не загружены
    if (!currentPermissions || currentPermissions.length === 0) {
        console.log('No permissions loaded, loading permissions first');
        loadPermissions().then(() => {
            // Повторно вызываем функцию после загрузки разрешений
            showRoleModal(roleId);
        });
        return;
    }
    
    if (roleId) {
        // Редактирование существующей роли
        const role = currentRoles.find(r => r.id == roleId);
        if (!role) {
            console.error('Role not found:', roleId);
            return;
        }
        
        // Заполняем форму данными роли
        document.getElementById('roleId').value = role.id;
        document.getElementById('roleName').value = role.name;
        
        if (role.description) {
            document.getElementById('roleDescription').value = role.description;
        }
        
        // Админ-роль больше не используется отдельным чекбоксом
        
        if (titleEl) {
            titleEl.textContent = 'Редактирование роли';
        }
    } else {
        // Создание новой роли
        document.getElementById('roleId').value = '';
        
        if (titleEl) {
            titleEl.textContent = 'Добавление новой роли';
        }
    }
    
    // Вызываем функцию инициализации модальных окон ролей, которая содержит populatePermissionsChecklist
    initRoleModal();
    
    // После инициализации запускаем setTimeout, чтобы дать время на загрузку разрешений
    // Загружаем данные роли для получения разрешений
    let rolePermissions = [];
    
    // Функция для загрузки разрешений роли
    const loadRolePermissions = async () => {
        if (roleId) {
            try {
                // Используем правильный путь API с конфигурацией
                const roleEndpoint = `${config.API_BASE_URL}${config.API_PREFIX}/roles/${roleId}/`;
                console.log('Loading role data from:', roleEndpoint);
                
                const roleResponse = await fetchWithAuth(roleEndpoint);
                if (roleResponse.ok) {
                    const roleData = await roleResponse.json();
                    console.log('Loaded role data:', roleData);
                    
                    // Получаем разрешения этой роли
                    rolePermissions = roleData.permissions || [];
                    console.log('Role permissions:', rolePermissions);
                    
                    // После получения разрешений роли заполняем интерфейс
                    updatePermissionsUI(rolePermissions);
                } else {
                    console.error('Failed to load role data, status:', roleResponse.status);
                    updatePermissionsUI([]); // Show empty permissions on error
                }
            } catch (error) {
                console.error('Error loading role permissions:', error);
                updatePermissionsUI([]); // Show empty permissions on error
            }
        } else {
            // Если роль не указана, просто показываем пустой список разрешений
            updatePermissionsUI([]);
        }
    };
    
    // Запускаем загрузку разрешений
    loadRolePermissions();
    
    // Функция для обновления UI с разрешениями
    function updatePermissionsUI(permissions) {
        // Пытаемся найти и заполнить контейнер разрешений напрямую
        const permContainer = document.getElementById('rolePermissionsContainer');
        if (permContainer) {
            // Очищаем контейнер
            permContainer.innerHTML = '<div class="text-center p-4">Загрузка разрешений...</div>';
            
            // Загружаем разрешения, если необходимо
            if (!currentPermissions || currentPermissions.length === 0) {
                loadPermissions().then(() => {
                    // Заполняем разрешения вручную
                    createPermissionsCheckboxes(permContainer, permissions);
                });
            } else {
                // Заполняем разрешения вручную
                createPermissionsCheckboxes(permContainer, permissions);
            }
        }
    }
    
    // Отображаем модальное окно
    modal.classList.remove('hidden');
}

// Expose global functions
// Функция для создания чекбоксов разрешений
function createPermissionsCheckboxes(container, selectedPermissions = []) {
    console.log('Creating permission checkboxes, container:', container);
    console.log('Selected permissions:', selectedPermissions);
    
    // Преобразуем selectedPermissions в массив чисел для сравнения
    const selectedIds = selectedPermissions.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
    console.log('Converted permission IDs for comparison:', selectedIds);
    
    if (!container) {
        console.error('Container for permissions not found');
        return;
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    if (!currentPermissions || currentPermissions.length === 0) {
        container.innerHTML = '<div class="text-center p-4">Нет доступных разрешений</div>';
        return;
    }
    
    // Группируем разрешения по категориям
    const permissionsByCategory = {};
    currentPermissions.forEach(permission => {
        const category = permission.category || 'other';
        if (!permissionsByCategory[category]) {
            permissionsByCategory[category] = [];
        }
        permissionsByCategory[category].push(permission);
    });
    
    // Создаем HTML для разрешений по категориям
    Object.entries(permissionsByCategory).forEach(([category, permissions]) => {
        const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
        
        // Создаем заголовок категории
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'font-medium text-gray-700 dark:text-gray-300 mt-4 mb-2';
        categoryHeader.textContent = categoryTitle;
        container.appendChild(categoryHeader);
        
        // Создаем чекбокс "выбрать все" для категории
        const selectAllWrapper = document.createElement('div');
        selectAllWrapper.className = 'mb-2 flex items-center';
        
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = `select_all_${category}`;
        selectAllCheckbox.className = 'mr-2 w-4 h-4';
        
        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = `select_all_${category}`;
        selectAllLabel.textContent = 'Выбрать все в категории';
        selectAllLabel.className = 'text-sm text-gray-600 dark:text-gray-400';
        
        selectAllWrapper.appendChild(selectAllCheckbox);
        selectAllWrapper.appendChild(selectAllLabel);
        container.appendChild(selectAllWrapper);
        
        // Создаем контейнер для разрешений этой категории
        const permissionsGrid = document.createElement('div');
        permissionsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700';
        
        // Заполняем разрешения
        permissions.forEach(permission => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `perm_${permission.id}`;
            checkbox.name = 'permissions';
            checkbox.value = permission.id;
            checkbox.className = 'mr-2 w-4 h-4';
            checkbox.dataset.category = category;
            
            // Выбор разрешения, если оно уже выбрано
            if (selectedIds.includes(permission.id)) {
                checkbox.checked = true;
            }
            
            const label = document.createElement('label');
            label.htmlFor = `perm_${permission.id}`;
            label.textContent = permission.name;
            label.className = 'text-sm';
            label.title = permission.description || '';
            
            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            permissionsGrid.appendChild(wrapper);
        });
        
        container.appendChild(permissionsGrid);
        
        // Добавляем обработчик для "выбрать все"
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            permissionsGrid.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = isChecked;
            });
        });
    });
}

window.editPermission = editPermission;
window.editRole = editRole;
window.createPermissionsCheckboxes = createPermissionsCheckboxes;

// Инициализация модального окна пользователя
function initUserModal() {
    // Получение элементов DOM
    const addUserBtn = document.getElementById('addUserBtn');
    const userModal = document.getElementById('userModal');
    const userForm = document.getElementById('userForm');
    const closeUserModalBtn = userModal?.querySelector('.close-modal');
    const cancelUserBtn = document.getElementById('cancelUserBtn');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const userModalTitle = document.getElementById('userModalTitle');
    const passwordHelpText = document.getElementById('passwordHelpText');
    const userRoleSelect = document.getElementById('userRole');
    
    // Простое скрытие модального окна без анимации
    function closeUserModal() {
        userModal.classList.add('hidden');
        userForm.reset();
        document.getElementById('userId').value = '';
    }
    
    // Показ модального окна для создания нового пользователя
    async function showCreateUserModal() {
        // Сброс формы
        userForm.reset();
        document.getElementById('userId').value = '';
        
        // Обновление заголовка и подсказки для пароля
        userModalTitle.textContent = window.i18n.t('createNewUser') || 'Создать нового пользователя';
        
        // Показываем поле для пароля
        const passwordField = document.getElementById('passwordField');
        if (passwordField) {
            passwordField.classList.remove('hidden');
        }
        
        // Скрываем подсказку для пароля (она нужна только при редактировании)
        const passwordHelpText = document.getElementById('passwordHelpText');
        if (passwordHelpText) {
            passwordHelpText.classList.add('hidden');
        }
        
        // Скрываем секцию выбора существующего пользователя
        const existingUserSection = document.getElementById('existingUserSection');
        if (existingUserSection) {
            existingUserSection.classList.add('hidden');
        }
        
        // Make sure roles are loaded before populating the select
        if (!currentRoles || currentRoles.length === 0) {
            console.log('Roles not loaded yet, loading roles first...');
            try {
                await loadRoles();
            } catch (error) {
                console.error('Error loading roles:', error);
                showToast('Error loading roles', 'error');
            }
        }
        
        // Заполнение выпадающего списка ролей
        populateRoleSelect();
        
        // Устанавливаем флаг, что это создание нового пользователя
        userModal.dataset.mode = 'create';
        
        // Простое отображение модального окна
        userModal.classList.remove('hidden');
    }
    
    // Показ модального окна для добавления существующего пользователя в проект
    async function showAddUserModal() {
        // Сброс формы
        userForm.reset();
        document.getElementById('userId').value = '';
        
        // Обновление заголовка и подсказки для пароля
        userModalTitle.textContent = window.i18n.t('addExistingUser') || 'Добавить существующего пользователя';
        
        // Скрыть поле пароля, так как оно не нужно при добавлении существующего пользователя
        const passwordField = document.getElementById('passwordField');
        if (passwordField) {
            passwordField.classList.add('hidden');
        }
        
        // Показать секцию выбора существующего пользователя
        const existingUserSection = document.getElementById('existingUserSection');
        if (existingUserSection) {
            existingUserSection.classList.remove('hidden');
        }
        
        // Make sure roles are loaded before populating the select
        if (!currentRoles || currentRoles.length === 0) {
            console.log('Roles not loaded yet, loading roles first...');
            try {
                await loadRoles();
            } catch (error) {
                console.error('Error loading roles:', error);
                showToast('Error loading roles', 'error');
            }
        }
        
        // Заполнение выпадающего списка ролей
        populateRoleSelect();
        
        // Загрузка всех пользователей системы для выбора
        try {
            const allUsersResponse = await fetchWithAuth('users/all/');
            if (allUsersResponse.ok) {
                const allUsers = await allUsersResponse.json();
                console.log('All users loaded:', allUsers);
                
                // Заполняем выпадающий список существующих пользователей
                populateExistingUsersSelect(allUsers);
                
                // Добавляем обработчик события выбора пользователя
                const existingUserSelect = document.getElementById('existingUserSelect');
                if (existingUserSelect) {
                    existingUserSelect.addEventListener('change', function(e) {
                        const selectedUserId = e.target.value;
                        if (selectedUserId) {
                            // Находим пользователя по ID
                            const selectedUser = allUsers.find(user => user.id == selectedUserId);
                            if (selectedUser) {
                                // Заполняем поля формы данными выбранного пользователя
                                document.getElementById('username').value = selectedUser.username || '';
                                document.getElementById('firstName').value = selectedUser.first_name || '';
                                document.getElementById('lastName').value = selectedUser.last_name || '';
                                document.getElementById('middleName').value = selectedUser.middle_name || '';
                                document.getElementById('email').value = selectedUser.email || '';
                                
                                // Проверяем, есть ли у пользователя роль
                                if (selectedUser.role) {
                                    document.getElementById('userRole').value = selectedUser.role;
                                }
                                
                                // Устанавливаем статус активности
                                document.getElementById('userStatus').value = selectedUser.is_active ? 'true' : 'false';
                            }
                        } else {
                            // Если пользователь не выбран, очищаем поля формы
                            userForm.reset();
                        }
                    });
                }
            } else {
                console.error('Failed to load all users:', allUsersResponse.status);
                showToast('Не удалось загрузить список пользователей', 'error');
            }
        } catch (error) {
            console.error('Error loading all users:', error);
            showToast('Ошибка при загрузке списка пользователей', 'error');
        }
        
        // Устанавливаем флаг, что это добавление существующего пользователя
        userModal.dataset.mode = 'add';
        
        // Простое отображение модального окна
        userModal.classList.remove('hidden');
    }
    
    // Функция заполнения выпадающего списка существующих пользователей
    function populateExistingUsersSelect(users) {
        const select = document.getElementById('existingUserSelect');
        if (!select) return;
        
        // Очищаем список, кроме первого элемента (опция "Выберите пользователя")
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Добавляем пользователей в список
        if (Array.isArray(users) && users.length > 0) {
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                option.textContent = `${user.username}${fullName ? ` (${fullName})` : ''}`;
                select.appendChild(option);
            });
        } else {
            // Если пользователей нет, добавляем информационную опцию
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Нет доступных пользователей';
            option.disabled = true;
            select.appendChild(option);
        }
    }
    
    // Показ модального окна для редактирования существующего пользователя
    function showEditUserModal(userId) {
        const user = currentUsers.find(u => u.id === userId);
        if (!user) {
            console.error(`User with ID ${userId} not found`);
            return;
        }
        
        // Заполнение формы данными пользователя
        document.getElementById('userId').value = user.id;
        document.getElementById('username').value = user.username;
        document.getElementById('firstName').value = user.first_name || '';
        document.getElementById('lastName').value = user.last_name || '';
        document.getElementById('middleName').value = user.middle_name || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('userStatus').value = user.is_active.toString();
        
        // Обновление заголовка и подсказки для пароля
        userModalTitle.textContent = window.i18n.t('editUser') || 'Редактировать пользователя';
        
        // Показываем поле для пароля
        const passwordField = document.getElementById('passwordField');
        if (passwordField) {
            passwordField.classList.remove('hidden');
        }
        
        // Показываем подсказку для пароля при редактировании
        const passwordHelpText = document.getElementById('passwordHelpText');
        if (passwordHelpText) {
            passwordHelpText.classList.remove('hidden');
        }
        
        // Скрываем секцию выбора существующего пользователя
        const existingUserSection = document.getElementById('existingUserSection');
        if (existingUserSection) {
            existingUserSection.classList.add('hidden');
        }
        
        // Заполнение выпадающего списка ролей
        populateRoleSelect(user.role);
        
        // Устанавливаем флаг, что это редактирование пользователя
        userModal.dataset.mode = 'edit';
        
        // Простое отображение модального окна
        userModal.classList.remove('hidden');
    }
    
    // Заполнение выпадающего списка ролей
    function populateRoleSelect(selectedRoleId) {
        if (!userRoleSelect) return;
        
        // Очистка списка
        userRoleSelect.innerHTML = `<option value="" data-i18n="selectRole">${window.i18n.t('selectRole')}</option>`;
        
        // Заполнение списка доступными ролями
        currentRoles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.name;
            if (selectedRoleId && role.id === selectedRoleId) {
                option.selected = true;
            }
            userRoleSelect.appendChild(option);
        });
    }
    
    // Сохранение пользователя
    async function saveUser(e) {
        e.preventDefault();
        
        console.log("Save user function called");
        
        // Сбрасываем все ошибки с предыдущих попыток
        const formFields = document.querySelectorAll('#userForm input, #userForm select');
        formFields.forEach(field => {
            field.classList.remove('border-red-500');
            field.setCustomValidity('');
            
            // Удаляем сообщения об ошибках
            const errorMsgs = field.parentNode.querySelectorAll('.text-red-500');
            errorMsgs.forEach(msg => field.parentNode.removeChild(msg));
        });
        
        const userId = document.getElementById('userId').value;
        // Проверяем режим операции - создание нового, добавление существующего или редактирование
        const mode = userModal.dataset.mode || (userId ? 'edit' : 'create');
        const isNewUser = mode === 'create';
        const isAddExisting = mode === 'add';
        
        console.log(`Operation mode: ${mode}`);
        
        // Получение полей формы
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        
        // Получение значений полей
        const usernameValue = usernameInput.value.trim();
        const emailValue = emailInput.value.trim();
        const firstNameValue = firstNameInput.value.trim();
        const lastNameValue = lastNameInput.value.trim();
        
        console.log(`Form values: username=${usernameValue}, email=${emailValue}, firstName=${firstNameValue}, lastName=${lastNameValue}`);
        
        // Сбор данных формы
        const userData = {
            username: usernameValue,
            first_name: firstNameInput.value.trim(),
            last_name: lastNameInput.value.trim(),
            middle_name: document.getElementById('middleName').value.trim(),
            email: emailValue,
            is_active: document.getElementById('userStatus').value === 'true',
            role: document.getElementById('userRole').value
        };
        
        // Если это обновление, добавляем ID
        if (!isNewUser && !isAddExisting) {
            userData.id = userId;
        }
        
        // Добавление пароля только для новых пользователей или если пароль был изменен
        const password = document.getElementById('password').value;
        if ((isNewUser || password) && !isAddExisting) {
            userData.password = password;
        }
        
        // Если добавляем существующего пользователя, нам нужен либо ID, либо username
        if (isAddExisting) {
            // Здесь должна быть логика для получения ID пользователя, которого добавляем
            // Например, можно добавить скрытое поле для ID выбранного пользователя
            const selectedUserId = document.querySelector('#existingUserSelect')?.value;
            if (selectedUserId) {
                userData.user_id = selectedUserId;
            } else {
                // Если нет ID, используем имя пользователя
                userData.username = usernameValue;
            }
        }
        
        // Показываем индикатор загрузки
        const saveButton = document.getElementById('saveUserBtn');
        const originalButtonText = saveButton.innerHTML;
        saveButton.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Сохранение...';
        saveButton.disabled = true;
    
        try {
            let response;
            
            if (isNewUser) {
                // Создание нового пользователя
                const userEndpoint = `${config.API_BASE_URL}/create-user/`;
                console.log('Creating user at endpoint:', userEndpoint);
                console.log('User data being sent:', userData);

                // Заголовки для запроса
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                response = await fetch(userEndpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(userData),
                    credentials: 'include' // Include cookies for session auth
                });
            } else if (isAddExisting) {
                // Добавление существующего пользователя в проект
                const addUserEndpoint = `${config.API_BASE_URL}/add-user-to-project/`;
                console.log('Adding existing user at endpoint:', addUserEndpoint);
                console.log('User data being sent:', userData);
                
                response = await fetchWithAuth(addUserEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
            } else {
                // Обновление существующего пользователя
                const userEndpoint = `${config.API_BASE_URL}/api/users/${userId}/`;
                console.log('Updating user at endpoint:', userEndpoint);
                response = await fetchWithAuth(userEndpoint, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
            }
            
            if (!response.ok) {
                let errorMessage = `Failed to ${isNewUser ? 'create' : 'update'} user: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = '';
                    
                    // Handle different types of error responses
                    if (typeof errorData === 'object') {
                        // Check for a username field-specific error (username already exists)
                        if (errorData.username) {
                            // This is a field-specific error for username
                            const usernameField = document.getElementById('username');
                            const errorContainer = usernameField.parentNode.querySelector('.error-message');
                            
                            if (usernameField && errorContainer) {
                                // Display error directly on the field
                                errorMessage = errorData.username;
                                usernameField.classList.add('border-red-500');
                                errorContainer.textContent = errorData.username;
                                errorContainer.className = 'error-message text-red-500 text-xs mt-1';
                                
                                // Clear error when user starts typing
                                usernameField.addEventListener('input', function() {
                                    this.classList.remove('border-red-500');
                                    errorContainer.textContent = '';
                                    errorContainer.className = 'error-message';
                                }, {once: true});
                                
                                // Show error notification immediately with proper error message
                                showToast(`Ошибка: ${errorMessage}`, 'error');
                                
                                // Disable loading state on button
                                saveButton.innerHTML = originalButtonText;
                                saveButton.disabled = false;
                                
                                // Return from the function immediately without further processing
                                return;
                            }
                        }
                        
                        // Process field errors if they exist
                        Object.keys(errorData).forEach(key => {
                            if (Array.isArray(errorData[key])) {
                                errorMessage += `${key}: ${errorData[key].join(', ')}; `;
                            } else {
                                errorMessage += `${key}: ${errorData[key]}; `;
                            }
                            
                            // Get field and error container
                            const fieldId = key === 'username' ? 'username' : 
                                           key === 'email' ? 'email' : 
                                           key === 'password' ? 'password' : 
                                           key === 'first_name' ? 'firstName' :
                                           key === 'last_name' ? 'lastName' : '';
                            
                            if (fieldId) {
                                const field = document.getElementById(fieldId);
                                if (field) {
                                    // Highlight field
                                    field.classList.add('border-red-500');
                                    
                                    // Find error container
                                    const errorContainer = field.parentNode.querySelector('.error-message');
                                    if (errorContainer) {
                                        // Display error message
                                        errorContainer.textContent = errorData[key];
                                        errorContainer.className = 'error-message text-red-500 text-xs mt-1';
                                        
                                        // Clear error when user starts typing
                                        field.addEventListener('input', function() {
                                            this.classList.remove('border-red-500');
                                            errorContainer.textContent = '';
                                            errorContainer.className = 'error-message';
                                        }, {once: true});
                                    }
                                }
                            }
                        });
                    } else if (typeof errorData === 'string') {
                        errorMessage = errorData;
                    }
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                
                throw new Error(errorMessage || `Failed to ${isNewUser ? 'create' : 'update'} user: ${response.status}`);
            }
            
            // Получим данные о созданном пользователе
            const responseData = await response.json();
            console.log('User created/updated successfully:', responseData.username);
            
            // Закрытие модального окна
            closeUserModal();
            
            // Сообщение об успехе
            if (isNewUser) {
                showToast(`Пользователь "${responseData.username}" успешно создан`, 'success');
                // Сбросить форму, чтобы показать, что новый пользователь создан
                userForm.reset();
            } else if (isAddExisting) {
                showToast(`Пользователь "${responseData.username}" успешно добавлен в проект`, 'success');
                // Сбросить форму
                userForm.reset();
            } else {
                showToast(`Пользователь "${responseData.username}" успешно обновлен`, 'success');
            }
            
            // Обновление списка пользователей
            try {
                await loadUsers();
                console.log('User list refreshed after creation/update');
            } catch (err) {
                console.error('Error refreshing user list:', err);
            }
        } catch (error) {
            console.error('Error saving user:', error);
            showToast(`${window.i18n.t('errorSavingUser')}: ${error.message}`, 'error');
        } finally {
            // Восстанавливаем кнопку в любом случае
            saveButton.innerHTML = originalButtonText;
            saveButton.disabled = false;
        }
    }
    
    // Привязка обработчиков событий
    const createUserBtn = document.getElementById('createUserBtn');
    
    if (createUserBtn) {
        createUserBtn.addEventListener('click', showCreateUserModal);
        console.log('Create user button event listener added');
    }
    
    if (addUserBtn) {
        addUserBtn.addEventListener('click', showAddUserModal);
        console.log('Add user button event listener added');
    }
    
    if (closeUserModalBtn) {
        closeUserModalBtn.addEventListener('click', closeUserModal);
    }
    
    if (cancelUserBtn) {
        cancelUserBtn.addEventListener('click', closeUserModal);
    }
    
    if (userForm) {
        userForm.addEventListener('submit', saveUser);
    }
    
    // Add event listener for the save button
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', saveUser);
        console.log('Save button event listener added');
    }
    
    // Экспортируем функцию для внешнего использования
    window.editUser = showEditUserModal;
}

// Функция отображения уведомления
function showToast(message, type = 'info') {
    // Создание элемента уведомления
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white`;
    toast.textContent = message;
    
    // Добавление уведомления на страницу
    document.body.appendChild(toast);
    
    // Автоматическое удаление уведомления через 3 секунды
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 500);
    }, 3000);
}

// Функция инициализации модального окна роли
function initRoleModal() {
    // Получение элементов DOM
    const addRoleBtn = document.getElementById('addRoleBtn');
    const roleModal = document.getElementById('roleModal');
    const roleForm = document.getElementById('roleForm');
    const roleModalTitle = document.getElementById('roleModalTitle');
    const permissionsContainer = document.getElementById('rolePermissionsContainer');
    
    console.log('Initializing role modal, elements:', {
        addRoleBtn, 
        roleModal, 
        roleForm, 
        roleModalTitle, 
        permissionsContainer
    });
    
    // Скрытие модального окна
    function closeRoleModal() {
        if (roleModal) {
            roleModal.classList.add('hidden');
        }
        if (roleForm) {
            roleForm.reset();
        }
        const roleIdInput = document.getElementById('roleId');
        if (roleIdInput) {
            roleIdInput.value = '';
        }
    }
    
    // Добавляем обработчик для открытия модального окна роли
    if (addRoleBtn) {
        addRoleBtn.addEventListener('click', () => showRoleModal());
    }
    
    // Добавляем обработчики для закрытия модального окна
    const cancelRoleBtn = document.getElementById('cancelRoleBtn');
    if (cancelRoleBtn) {
        cancelRoleBtn.addEventListener('click', closeRoleModal);
    }
    
    // Обработчик для сохранения роли
    const saveRoleBtn = document.getElementById('saveRoleBtn');
    if (saveRoleBtn && roleForm) {
        // Удаляем старый обработчик, если он есть
        saveRoleBtn.removeEventListener('click', saveRoleHandler);
        
        // Добавляем новый обработчик
        saveRoleBtn.addEventListener('click', saveRoleHandler);
    }
    
    // Функция сохранения роли
    async function saveRoleHandler(e) {
        e.preventDefault();
        console.log('Save role button clicked');
        
        // Собираем данные формы
        const roleId = document.getElementById('roleId').value;
        const roleName = document.getElementById('roleName').value;
        const roleDescription = document.getElementById('roleDescription').value;
        // Больше не используем отдельную админ-роль
        
        // Собираем выбранные разрешения
        const selectedPermissions = [];
        document.querySelectorAll('#rolePermissionsContainer input[type="checkbox"]:checked').forEach(checkbox => {
            // Пропускаем чекбоксы категорий (они имеют id, начинающийся с "select_all_")
            if (!checkbox.id.startsWith('select_all_')) {
                selectedPermissions.push(checkbox.value);
            }
        });
        
        console.log('Role data to save:', {
            id: roleId,
            name: roleName,
            description: roleDescription,
            permissions: selectedPermissions
        });
        
        // Формируем объект данных роли
        const roleData = {
            name: roleName,
            description: roleDescription,
            permissions: selectedPermissions
        };
        
        try {
                let response;
                
                if (roleId) {
                    // Обновление существующей роли
                    const updateEndpoint = `${config.API_BASE_URL}${config.API_PREFIX}/roles/${roleId}/`;
                    console.log('Updating role at endpoint:', updateEndpoint);
                    
                    response = await fetchWithAuth(updateEndpoint, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(roleData)
                    });
                } else {
                    // Создание новой роли
                    const createEndpoint = `${config.API_BASE_URL}${config.API_PREFIX}/roles/`;
                    console.log('Creating role at endpoint:', createEndpoint);
                    
                    response = await fetchWithAuth(createEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(roleData)
                    });
                }
                
                if (!response.ok) {
                    throw new Error(`Failed to ${roleId ? 'update' : 'create'} role: ${response.status}`);
                }
                
                // Перезагрузка списка ролей
                await loadRoles();
                
                // Закрытие модального окна
                closeRoleModal();
                
                // Уведомление об успешном сохранении
                showToast(`Роль успешно ${roleId ? 'обновлена' : 'создана'}`, 'success');
                
            } catch (error) {
                console.error('Error saving role:', error);
                showToast(`Ошибка при сохранении роли: ${error.message}`, 'error');
            }
    }
    
    // Заполнение списка разрешений
    function populatePermissionsChecklist(selectedPermissions = []) {
        console.log('Populating permissions checklist, selected:', selectedPermissions);
        
        // Загрузим разрешения, если они еще не загружены
        if (!currentPermissions || currentPermissions.length === 0) {
            console.log('No permissions loaded, loading permissions first');
            loadPermissions().then(() => {
                populatePermissionsChecklist(selectedPermissions);
            });
            return;
        }
        
        if (!permissionsContainer) {
            console.error('Permissions container not found. Looking for element with ID "permissionsContainer"');
            const container = document.getElementById('permissionsContainer');
            if (!container) {
                console.error('Still cannot find permissions container!');
                return;
            }
            permissionsContainer = container;
        }
        
        // Очистка списка
        permissionsContainer.innerHTML = '';
        
        // Создаем фильтр категорий сверху контейнера разрешений
        const categoryFilterContainer = document.createElement('div');
        categoryFilterContainer.className = 'mb-4';
        
        const filterLabel = document.createElement('label');
        filterLabel.className = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
        filterLabel.textContent = window.i18n?.t('filterPermissionsByCategory') || 'Filter by category';
        
        const categorySelect = document.createElement('select');
        categorySelect.className = 'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-coral-500 focus:border-coral-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-coral-500 dark:focus:border-coral-500';
        categorySelect.id = 'permissionCategoryFilter';
        
        // Опция "Все категории"
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = window.i18n?.t('allCategories') || 'All Categories';
        categorySelect.appendChild(allOption);
        
        // Получаем уникальные категории
        const categories = [...new Set(currentPermissions.map(p => p.category || 'other'))];
        
        // Добавляем опции для каждой категории
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
            option.textContent = categoryName;
            categorySelect.appendChild(option);
        });
        
        categoryFilterContainer.appendChild(filterLabel);
        categoryFilterContainer.appendChild(categorySelect);
        permissionsContainer.appendChild(categoryFilterContainer);

        // Добавляем поиск по названию разрешения
        const searchContainer = document.createElement('div');
        searchContainer.className = 'mb-4';
        
        const searchLabel = document.createElement('label');
        searchLabel.className = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
        searchLabel.textContent = window.i18n?.t('searchPermissions') || 'Search permissions';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-coral-500 focus:border-coral-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-coral-500 dark:focus:border-coral-500';
        searchInput.id = 'permissionSearchFilter';
        searchInput.placeholder = window.i18n?.t('searchPermissionsPlaceholder') || 'Type to search permissions...';
        
        searchContainer.appendChild(searchLabel);
        searchContainer.appendChild(searchInput);
        permissionsContainer.appendChild(searchContainer);
        
        // Контейнер для чекбоксов разрешений
        const permissionsCheckboxContainer = document.createElement('div');
        permissionsCheckboxContainer.id = 'permissionsCheckboxContainer';
        permissionsCheckboxContainer.className = 'space-y-4 mt-4 max-h-60 overflow-y-auto pr-2';
        permissionsContainer.appendChild(permissionsCheckboxContainer);
        
        // Группировка разрешений по категориям
        const permissionsByCategory = {};
        currentPermissions.forEach(permission => {
            const category = permission.category || 'other';
            if (!permissionsByCategory[category]) {
                permissionsByCategory[category] = [];
            }
            permissionsByCategory[category].push(permission);
        });
        
        // Создание и добавление чекбоксов для разрешений
        Object.entries(permissionsByCategory).forEach(([category, permissions]) => {
            const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
            
            // Заголовок категории
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'mb-2 mt-4 font-medium text-gray-700 dark:text-gray-300 category-header';
            categoryHeader.dataset.category = category;
            categoryHeader.textContent = categoryTitle;
            
            // Добавляем чекбокс для выбора всех разрешений в категории
            const categoryCheckboxWrapper = document.createElement('div');
            categoryCheckboxWrapper.className = 'flex items-center mb-2';
            
            const categoryCheckbox = document.createElement('input');
            categoryCheckbox.type = 'checkbox';
            categoryCheckbox.id = `category_${category}`;
            categoryCheckbox.className = 'w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500 dark:focus:ring-coral-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600';
            categoryCheckbox.dataset.category = category;
            
            // Проверяем, все ли разрешения в категории выбраны
            const allCategoryPermissionsSelected = permissions.every(permission => 
                selectedPermissions.includes(permission.id)
            );
            categoryCheckbox.checked = allCategoryPermissionsSelected;
            
            const categoryLabel = document.createElement('label');
            categoryLabel.htmlFor = `category_${category}`;
            categoryLabel.className = 'ms-2 text-sm font-medium text-gray-900 dark:text-gray-300';
            categoryLabel.textContent = `${window.i18n?.t('selectAll') || 'Select all'} ${categoryTitle}`;
            
            categoryCheckboxWrapper.appendChild(categoryCheckbox);
            categoryCheckboxWrapper.appendChild(categoryLabel);
            
            permissionsCheckboxContainer.appendChild(categoryHeader);
            permissionsCheckboxContainer.appendChild(categoryCheckboxWrapper);
            
            // Чекбоксы для разрешений
            const permissionsGroup = document.createElement('div');
            permissionsGroup.className = 'grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 permission-group';
            permissionsGroup.dataset.category = category;
            
            permissions.forEach(permission => {
                const permissionWrapper = document.createElement('div');
                permissionWrapper.className = 'flex items-center mb-2 permission-item';
                permissionWrapper.dataset.category = category;
                permissionWrapper.dataset.permissionName = permission.name.toLowerCase();
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `permission_${permission.id}`;
                checkbox.name = 'permissions';
                checkbox.value = permission.id;
                checkbox.className = 'w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500 dark:focus:ring-coral-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 permission-checkbox';
                checkbox.dataset.category = category;
                
                // Выбор разрешения, если оно уже выбрано
                if (selectedPermissions.includes(permission.id)) {
                    checkbox.checked = true;
                }
                
                const label = document.createElement('label');
                label.htmlFor = `permission_${permission.id}`;
                label.className = 'ms-2 text-sm font-medium text-gray-900 dark:text-gray-300';
                label.title = permission.description || '';
                label.textContent = permission.name;
                
                permissionWrapper.appendChild(checkbox);
                permissionWrapper.appendChild(label);
                permissionsGroup.appendChild(permissionWrapper);
            });
            
            permissionsCheckboxContainer.appendChild(permissionsGroup);
        });
        
        // Добавляем обработчики событий для категории и поиска
        document.getElementById('permissionCategoryFilter')?.addEventListener('change', filterPermissionsByCategory);
        document.getElementById('permissionSearchFilter')?.addEventListener('input', filterPermissionsByName);
        
        // Обработчик выбора всех разрешений в категории
        const categoryCheckboxes = document.querySelectorAll('input[id^="category_"]');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const category = e.target.dataset.category;
                const isChecked = e.target.checked;
                const categoryPermissions = document.querySelectorAll(`input[data-category="${category}"].permission-checkbox`);
                
                categoryPermissions.forEach(permissionCheckbox => {
                    permissionCheckbox.checked = isChecked;
                });
            });
        });
        
        // Обработчик изменения разрешений для обновления статуса чекбокса категории
        const permissionCheckboxes = document.querySelectorAll('.permission-checkbox');
        permissionCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const category = e.target.dataset.category;
                const categoryPermissions = document.querySelectorAll(`input[data-category="${category}"].permission-checkbox`);
                const categoryCheckbox = document.getElementById(`category_${category}`);
                
                const allChecked = Array.from(categoryPermissions).every(checkbox => checkbox.checked);
                categoryCheckbox.checked = allChecked;
            });
        });
        
        // Инициализируем обработчики для кнопок "выбрать все" и "снять все"
        initSelectAllPermissionsHandlers();
    }
    
    // Функция фильтрации разрешений по категории
    function filterPermissionsByCategory(e) {
        const category = e.target.value;
        const permissionItems = document.querySelectorAll('.permission-item');
        const categoryHeaders = document.querySelectorAll('.category-header');
        const permissionGroups = document.querySelectorAll('.permission-group');
        
        if (!category) {
            // Показать все разрешения
            permissionItems.forEach(item => item.style.display = '');
            categoryHeaders.forEach(header => header.style.display = '');
            permissionGroups.forEach(group => group.style.display = '');
        } else {
            // Показать только разрешения выбранной категории
            permissionItems.forEach(item => {
                if (item.dataset.category === category) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
            
            categoryHeaders.forEach(header => {
                if (header.dataset.category === category) {
                    header.style.display = '';
                } else {
                    header.style.display = 'none';
                }
            });
            
            permissionGroups.forEach(group => {
                if (group.dataset.category === category) {
                    group.style.display = '';
                } else {
                    group.style.display = 'none';
                }
            });
        }
        
        // Применяем еще и текущий поисковый фильтр
        const searchInput = document.getElementById('permissionSearchFilter');
        if (searchInput && searchInput.value.trim()) {
            filterPermissionsByName({ target: searchInput });
        }
    }
    
    // Функция фильтрации разрешений по имени
    function filterPermissionsByName(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        const categoryFilter = document.getElementById('permissionCategoryFilter');
        const selectedCategory = categoryFilter ? categoryFilter.value : '';
        
        const permissionItems = document.querySelectorAll('.permission-item');
        
        permissionItems.forEach(item => {
            const permissionName = item.dataset.permissionName;
            const itemCategory = item.dataset.category;
            
            // Применяем оба фильтра - по категории и по имени
            const matchesCategory = !selectedCategory || itemCategory === selectedCategory;
            const matchesSearch = !searchTerm || permissionName.includes(searchTerm);
            
            if (matchesCategory && matchesSearch) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Скрываем заголовки категорий без видимых элементов
        document.querySelectorAll('.category-header').forEach(header => {
            const category = header.dataset.category;
            const hasVisibleItems = Array.from(document.querySelectorAll(`.permission-item[data-category="${category}"]`)).some(item => item.style.display !== 'none');
            header.style.display = hasVisibleItems ? '' : 'none';
            
            // Также скрываем чекбокс "выбрать все" для категории
            const categoryCheckboxWrapper = document.querySelector(`#category_${category}`).parentElement;
            if (categoryCheckboxWrapper) {
                categoryCheckboxWrapper.style.display = hasVisibleItems ? '' : 'none';
            }
        });
    }
    
    // Инициализация обработчиков для кнопок "выбрать все" и "снять все"
    function initSelectAllPermissionsHandlers() {
        const selectAllBtn = document.getElementById('selectAllPermissions');
        const deselectAllBtn = document.getElementById('deselectAllPermissions');
        const isAdminRoleCheckbox = document.getElementById('isAdminRole');
        
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                const visibleCheckboxes = Array.from(document.querySelectorAll('.permission-checkbox')).filter(checkbox => {
                    return checkbox.closest('.permission-item').style.display !== 'none';
                });
                
                visibleCheckboxes.forEach(checkbox => {
                    checkbox.checked = true;
                });
                
                // Обновляем состояние чекбоксов категорий
                updateCategoryCheckboxes();
            });
        }
        
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                const visibleCheckboxes = Array.from(document.querySelectorAll('.permission-checkbox')).filter(checkbox => {
                    return checkbox.closest('.permission-item').style.display !== 'none';
                });
                
                visibleCheckboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
                
                // Обновляем состояние чекбоксов категорий
                updateCategoryCheckboxes();
                
                // Снимаем флажок с Admin Role, если он установлен
                if (isAdminRoleCheckbox && isAdminRoleCheckbox.checked) {
                    isAdminRoleCheckbox.checked = false;
                }
            });
        }
        
        // Обработчик для чекбокса "Admin Role"
        if (isAdminRoleCheckbox) {
            isAdminRoleCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                
                if (isChecked) {
                    // Если выбрана админская роль, выбираем все разрешения
                    document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
                        checkbox.checked = true;
                    });
                }
                
                // Обновляем состояние чекбоксов категорий
                updateCategoryCheckboxes();
            });
        }
    }
    
    // Обновление состояния чекбоксов категорий на основе состояния разрешений
    function updateCategoryCheckboxes() {
        document.querySelectorAll('input[id^="category_"]').forEach(categoryCheckbox => {
            const category = categoryCheckbox.dataset.category;
            const categoryPermissions = document.querySelectorAll(`input[data-category="${category}"].permission-checkbox`);
            
            const allChecked = Array.from(categoryPermissions).every(checkbox => checkbox.checked);
            categoryCheckbox.checked = allChecked;
        });
    }
}

// Функция инициализации вкладок
function initTabSwitching() {
    console.log('Initializing tab switching...');
    
    // Получаем все ссылки на вкладки
    const tabLinks = document.querySelectorAll('.tab-link');
    
    // Получаем все содержимое вкладок
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Ничего не делаем, если нет ссылок или контента вкладок
    if (!tabLinks.length || !tabContents.length) {
        console.warn('Tab links or tab contents not found');
        return;
    }
    
    // Добавляем обработчик событий для каждой ссылки на вкладку
    tabLinks.forEach(tabLink => {
        tabLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Получаем идентификатор вкладки
            const tab = this.getAttribute('data-tab');
            console.log('Tab clicked:', tab);
            
            // Удаляем активный класс со всех ссылок
            tabLinks.forEach(link => link.classList.remove('active', 'border-coral-500', 'dark:border-coral-400'));
            tabLinks.forEach(link => link.classList.add('border-transparent'));
            
            // Добавляем активный класс к выбранной ссылке
            this.classList.add('active', 'border-coral-500', 'dark:border-coral-400');
            this.classList.remove('border-transparent');
            
            // Скрываем все содержимое вкладок
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Показываем содержимое выбранной вкладки
            const activeTab = document.getElementById(`${tab}-tab`);
            if (activeTab) {
                activeTab.classList.add('active');
            } else {
                console.warn(`Tab content for ${tab} not found`);
            }
            
            // Загружаем данные при необходимости
            if (tab === 'roles' && !document.querySelector('#roles-tab .role-item')) {
                console.log('Loading roles data...');
                loadRoles();
            } else if (tab === 'permissions' && !document.querySelector('#permissions-tab .permission-item')) {
                console.log('Loading permissions data...');
                loadPermissions();
            }
        });
    });
    
    console.log('Tab switching initialized');
}

// Загрузка пользователей
async function loadUsers() {
    console.log('Loading users data...');
    
    try {
        console.log('Loading users...');
        
        // Получаем данные о текущем пользователе
        const currentUserResponse = await fetchWithAuth('users/get_current_user/');
        console.log('Current user response:', currentUserResponse.status);
        if (!currentUserResponse.ok) {
            console.error('Current user response not OK:', currentUserResponse.status);
            throw new Error(`Failed to get current user: Status ${currentUserResponse.status}`);
        }
        
        const currentUserData = await currentUserResponse.json();
        console.log('Current user data:', currentUserData);
        
        // Создаем временный список с текущим пользователем
        let users = [currentUserData];
        
        // Пытаемся сначала загрузить ВСЕХ пользователей системы
        try {
            const allUsersResponse = await fetchWithAuth('users/all/');
            console.log('All users API response status:', allUsersResponse.status, allUsersResponse.statusText);
            
            if (allUsersResponse.ok) {
                const allUsersData = await allUsersResponse.json();
                console.log('All users data:', allUsersData);
                
                // Если получили массив пользователей, используем его
                if (Array.isArray(allUsersData)) {
                    users = allUsersData;
                    console.log('Using array of all users from API');
                } else if (allUsersData.results && Array.isArray(allUsersData.results)) {
                    users = allUsersData.results;
                    console.log('Using results array from all users API response');
                } else if (allUsersData.users && Array.isArray(allUsersData.users)) {
                    users = allUsersData.users;
                    console.log('Using users array from all users API response');
                }
            } else {
                console.warn('Could not fetch all users, trying regular users endpoint');
                
                // Если не получилось загрузить всех пользователей, используем обычный эндпоинт
                // Use our standardized fetchWithAuth for the users endpoint
                const response = await fetchWithAuth('users/');
                console.log('Users API response status:', response.status, response.statusText);
                
                if (response.ok) {
                    const userData = await response.json();
                    console.log('User data raw response:', userData);
                    
                    // Check if the response is an array or has a results property
                    if (Array.isArray(userData)) {
                        users = userData;
                        console.log('Using array of users from API');
                    } else if (userData.results && Array.isArray(userData.results)) {
                        users = userData.results;
                        console.log('Using results array from API response');
                    } else if (userData.users && Array.isArray(userData.users)) {
                        users = userData.users;
                        console.log('Using users array from API response');
                    } else if (userData && userData.id) {
                        // Single user object
                        users = [userData];
                        console.log('Using single user from API');
                    } else {
                        console.warn('User endpoint returned unexpected data format:', userData);
                    }
                } else {
                    console.warn('Could not fetch regular users, trying alternative endpoint');
                    
                    // Try an alternative endpoint if the first one fails
                    try {
                        const altResponse = await fetchWithAuth('api/users/');
                        console.log('Alternative API response status:', altResponse.status);
                        
                        if (altResponse.ok) {
                            const altData = await altResponse.json();
                            console.log('Alternative user data:', altData);
                            
                            if (Array.isArray(altData)) {
                                users = altData;
                            } else if (altData.results && Array.isArray(altData.results)) {
                                users = altData.results;
                            } else if (altData.users && Array.isArray(altData.users)) {
                                users = altData.users;
                            }
                        } else {
                            console.warn('Alternative endpoint also failed, using only current user');
                        }
                    } catch (altError) {
                        console.error('Error with alternative endpoint:', altError);
                    }
                }
            }
        } catch (err) {
            console.warn('Error fetching all users:', err);
            
            // Если не удалось загрузить всех пользователей, пробуем обычный эндпоинт
            try {
                const response = await fetchWithAuth('users/');
                if (response.ok) {
                    const userData = await response.json();
                    
                    if (Array.isArray(userData)) {
                        users = userData;
                    } else if (userData.results && Array.isArray(userData.results)) {
                        users = userData.results;
                    } else if (userData.users && Array.isArray(userData.users)) {
                        users = userData.users;
                    }
                }
            } catch (regularErr) {
                console.error('Error fetching users from regular endpoint:', regularErr);
            }
        }
        
        console.log('Final users data to display:', users);
        
        // Удаляем дубликаты по ID
        users = removeDuplicates(users, 'id');
        console.log('Users after deduplication:', users.length);
        
        // Store users for global use
        currentUsers = users;
        
        // Render users
        renderUsersList(users);

    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersTableBody').innerHTML = `
            <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td class="px-6 py-4 text-center text-red-500" colspan="6">Ошибка загрузки пользователей: ${error.message}</td>
            </tr>
        `;
        
        // No longer using mock data - just show the error
        console.error('Failed to load users data, please check API endpoints');
    }
}

// Рендеринг списка пользователей
function renderUsersList(users) {
    const tableBody = document.getElementById('usersTableBody');
    
    // Очищаем таблицу для нового содержимого
    if (tableBody) {
        tableBody.innerHTML = '';
    }
    
    if (!tableBody) {
        console.log('Users table body not found');
        return;
    }
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = `
            <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td class="px-6 py-4 text-center" colspan="6">Нет пользователей</td>
            </tr>
        `;
        return;
    }
    
    // Заполняем таблицу
    if (tableBody) {
        const tableRows = users.map(user => `
            <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4">${user.username}</td>
                <td class="px-6 py-4">${user.first_name || ''} ${user.last_name || ''}</td>
                <td class="px-6 py-4">${user.email || ''}</td>
                <td class="px-6 py-4">${user.role_name || 'Не назначена'}</td>
                <td class="px-6 py-4">
                    <span class="text-xs font-medium mr-2 px-2.5 py-0.5 rounded ${user.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}">
                        ${user.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                </td>
                <td class="px-6 py-4 flex space-x-2">
                    <button class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" onclick="editUser(${user.id})">
                        <i class="ri-edit-line text-lg"></i>
                    </button>
                    <button class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" onclick="showDeleteModal(${user.id}, 'user', '${user.username}')">
                        <i class="ri-delete-bin-line text-lg"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        tableBody.innerHTML = tableRows;
    }
}

// Загрузка ролей
async function loadRoles() {
    console.log('Loading roles data...');
    
    try {
        // Загружаем также и разрешения, если они еще не загружены
        if (!currentPermissions || currentPermissions.length === 0) {
            await loadPermissions();
        }
        
        // Use the correct API endpoint with config
        const rolesEndpoint = `${config.API_BASE_URL}${config.API_PREFIX}/roles/`;
        console.log('Roles API endpoint:', rolesEndpoint);
        
        const response = await fetchWithAuth(rolesEndpoint);
        console.log('Roles API response status:', response.status, response.statusText);
        
        if (!response.ok) {
            console.error('API response not OK:', response.status, response.statusText);
            throw new Error(`Failed to fetch roles: Status ${response.status}`);
        }
        
        const roles = await response.json();
        console.log('Roles loaded from API:', roles);
        
        // Store roles for global use
        currentRoles = roles;
        
        // Render roles
        renderRolesList(roles);
        
    } catch (error) {
        console.error('Error loading roles:', error);
        document.getElementById('rolesGrid').innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm col-span-full">
                <span class="text-red-500">Ошибка загрузки ролей: ${error.message}</span>
            </div>
        `;
        
        // Use mock data for development
        console.log('Using mock role data due to API error');
        const mockData = [
            { id: 1, name: 'Администратор', is_admin: true },
            { id: 2, name: 'Пользователь', is_admin: false }
        ];
        
        currentRoles = mockData;
        renderRolesList(mockData);
    }
}

// Рендеринг списка ролей
function renderRolesList(roles) {
    const rolesGrid = document.getElementById('rolesGrid');
    
    if (!rolesGrid) {
        console.error('Roles grid not found');
        return;
    }
    
    if (!roles || roles.length === 0) {
        rolesGrid.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm text-center col-span-full">
                <span class="text-gray-500 dark:text-gray-400">Нет ролей</span>
            </div>
        `;
        return;
    }
    
    // Очистка текущего содержимого grid перед добавлением ролей
    if (rolesGrid) {
        rolesGrid.innerHTML = '';
    }
    
    const roleCards = roles.map(role => `
        <div class="role-item bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">${role.name}</h3>
                <div class="flex space-x-2">
                    <button class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" onclick="editRole(${role.id})" title="Редактировать и управлять разрешениями">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" onclick="showDeleteModal(${role.id}, 'role', '${role.name}')" title="Удалить">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
            <div class="flex items-center mt-1 mb-2">
                ${role.is_admin ? '<span class="text-xs font-medium mr-2 px-2.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Админ</span>' : ''}
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                ${role.description || 'Нет описания'}
            </p>
        </div>
    `).join('');
    
    // Заполняем гридовый контейнер
    if (rolesGrid) {
        rolesGrid.innerHTML = roleCards;
    }
}

// Глобально доступная функция обновления чекбоксов категорий
window.updateCategoryCheckboxes = function() {
    document.querySelectorAll('input[id^="category_"]').forEach(categoryCheckbox => {
        const category = categoryCheckbox.dataset.category;
        const categoryPermissions = document.querySelectorAll(`input[data-category="${category}"].permission-checkbox`);
        
        const allChecked = Array.from(categoryPermissions).every(checkbox => checkbox.checked);
        categoryCheckbox.checked = allChecked;
    });
};

// Main initialization function for the Admin Panel
async function initAdminPanel() {
    console.log('Initializing Admin Panel...');

    try {
        // Initialize tab switching
        initTabSwitching();
        
        // Load users data (default tab)
        await loadUsers();
        
        // Initialize user modal
        initUserModal();
        
        // Initialize role modal
        initRoleModal();
        
        // Initialize permission filters
        initPermissionSearchFilter();
        
        // Initialize handlers for permission selection/deselection (after the function is defined)
        if (typeof initSelectAllPermissionsHandlers === 'function') {
            initSelectAllPermissionsHandlers();
        }
        
        console.log('Admin Panel initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize Admin Panel:', error);
        showToast('Failed to initialize Admin Panel: ' + error.message, 'error');
    }
}

// Функция для инициализации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log("Document loaded, initializing admin panel...");
    setTimeout(() => {
        initAdminPanel();
    }, 500);
});

// Make the function accessible globally
window.initAdminPanel = initAdminPanel;

// Variables for role permissions management
let currentManagingRoleId = null;
let currentManagingRoleName = '';
let currentRolePermissions = [];

// Function to manage role permissions
function manageRolePermissions(roleId, roleName) {
    console.log(`Managing permissions for role ${roleName} (ID: ${roleId})`);
    
    // Store role info
    currentManagingRoleId = roleId;
    currentManagingRoleName = roleName;
    
    // Update modal title
    const modalTitle = document.getElementById('rolePermissionsModalTitle');
    if (modalTitle) {
        modalTitle.textContent = `Управление разрешениями роли: ${roleName}`;
    }
    
    // Load role permissions
    loadRolePermissionsForModal(roleId);
    
    // Show modal
    const modal = document.getElementById('rolePermissionsModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Function to initialize role permissions modal
function initRolePermissionsModal() {
    console.log('Initializing role permissions modal');
    
    const modal = document.getElementById('rolePermissionsModal');
    const cancelBtn = document.getElementById('cancelRolePermissionsBtn');
    const saveBtn = document.getElementById('saveRolePermissionsBtn');
    const selectAllBtn = document.getElementById('selectAllModalPermissions');
    const deselectAllBtn = document.getElementById('deselectAllModalPermissions');
    const searchInput = document.getElementById('permissionsSearchInput');
    
    if (!modal) {
        console.error('Role permissions modal not found');
        return;
    }
    
    // Close modal on cancel
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeRolePermissionsModal);
    }
    
    // Save permissions on save
    if (saveBtn) {
        saveBtn.addEventListener('click', saveRolePermissions);
    }
    
    // Select all permissions
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            document.querySelectorAll('#modalRolePermissionsContainer input[type="checkbox"]').forEach(checkbox => {
                if (!checkbox.id.startsWith('select_all_modal_')) {
                    checkbox.checked = true;
                }
            });
            
            // Update category checkboxes
            document.querySelectorAll('#modalRolePermissionsContainer input[id^="select_all_modal_"]').forEach(categoryCheckbox => {
                categoryCheckbox.checked = true;
            });
        });
    }
    
    // Deselect all permissions
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', function() {
            document.querySelectorAll('#modalRolePermissionsContainer input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }
    
    // Filter permissions on search
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchValue = this.value.toLowerCase();
            document.querySelectorAll('#modalRolePermissionsContainer .permission-item').forEach(item => {
                const permissionName = item.querySelector('label').textContent.toLowerCase();
                const visible = permissionName.includes(searchValue);
                item.style.display = visible ? 'block' : 'none';
            });
            
            // Update category visibility based on whether any children are visible
            document.querySelectorAll('#modalRolePermissionsContainer .permission-category').forEach(category => {
                const visibleItems = Array.from(category.querySelectorAll('.permission-item')).some(item => 
                    item.style.display !== 'none'
                );
                
                category.style.display = visibleItems ? 'block' : 'none';
            });
        });
    }
}

// Function to load role permissions for the modal
async function loadRolePermissionsForModal(roleId) {
    if (!roleId) return;
    
    const container = document.getElementById('modalRolePermissionsContainer');
    if (!container) return;
    
    // Show loading
    container.innerHTML = '<div class="text-center p-4">Загрузка разрешений...</div>';
    
    try {
        // Load role data to get permissions
        const roleEndpoint = `${config.API_BASE_URL}${config.API_PREFIX}/roles/${roleId}/`;
        console.log('Loading role data for permissions from:', roleEndpoint);
        
        const roleResponse = await fetchWithAuth(roleEndpoint);
        if (!roleResponse.ok) {
            throw new Error(`Failed to load role: ${roleResponse.status}`);
        }
        
        const roleData = await roleResponse.json();
        console.log('Role data loaded:', roleData);
        
        // Store current permissions
        currentRolePermissions = roleData.permissions || [];
        
        // Load all permissions to show in modal
        await populateModalPermissions(container, currentRolePermissions);
        
    } catch (error) {
        console.error('Error loading role permissions:', error);
        container.innerHTML = `
            <div class="text-center p-4 text-red-500">
                Ошибка загрузки разрешений: ${error.message}
            </div>
        `;
    }
}

// Function to populate modal with permissions
async function populateModalPermissions(container, selectedPermissions) {
    try {
        // Load all permissions
        const permissionsEndpoint = `${config.API_BASE_URL}${config.API_PREFIX}/permissions/`;
        const response = await fetchWithAuth(permissionsEndpoint);
        
        if (!response.ok) {
            throw new Error(`Failed to load permissions: ${response.status}`);
        }
        
        const permissions = await response.json();
        
        // Group permissions by category
        const permissionsByCategory = {};
        permissions.forEach(permission => {
            const category = permission.category || 'Прочее';
            if (!permissionsByCategory[category]) {
                permissionsByCategory[category] = [];
            }
            permissionsByCategory[category].push(permission);
        });
        
        // Clear container
        container.innerHTML = '';
        
        // Format categories for display
        const formatCategoryName = (category) => {
            const categoryMap = {
                'user_management': 'Управление пользователями',
                'test_management': 'Управление тестами',
                'test_execution': 'Выполнение тестов',
                'reporting': 'Отчетность',
                'project_management': 'Управление проектами',
                'scheduling': 'Планирование',
                'automation': 'Автоматизация'
            };
            
            return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
        };
        
        // Generate HTML for each category
        let html = '';
        Object.keys(permissionsByCategory).sort().forEach(category => {
            const categoryPermissions = permissionsByCategory[category];
            const displayCategory = formatCategoryName(category);
            
            // Skip if no permissions
            if (!categoryPermissions.length) return;
            
            html += `
                <div class="permission-category mb-4">
                    <div class="flex items-center mb-2">
                        <input id="select_all_modal_${category}" type="checkbox" class="select-all-category w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500 dark:focus:ring-coral-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                        <label for="select_all_modal_${category}" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <strong>${displayCategory}</strong>
                        </label>
                    </div>
                    <div class="ml-6 space-y-2">
            `;
            
            // Add permissions for this category
            categoryPermissions.forEach(permission => {
                const isChecked = selectedPermissions.includes(permission.id) ? 'checked' : '';
                
                html += `
                    <div class="permission-item flex items-center">
                        <input id="modal_perm_${permission.id}" type="checkbox" value="${permission.id}" ${isChecked} class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500 dark:focus:ring-coral-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                        <label for="modal_perm_${permission.id}" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            ${permission.name}
                        </label>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        // Insert HTML
        container.innerHTML = html;
        
        // Initialize category checkboxes
        document.querySelectorAll('#modalRolePermissionsContainer input[id^="select_all_modal_"]').forEach(checkbox => {
            // Check initial state
            const category = checkbox.id.replace('select_all_modal_', '');
            const permissionCheckboxes = document.querySelectorAll(`#modalRolePermissionsContainer .permission-item input[id^="modal_perm_"]:not([id^="select_all_modal_"])`);
            const categoryPermissions = Array.from(permissionCheckboxes).filter(cb => {
                const permissionId = cb.id.replace('modal_perm_', '');
                const permission = permissions.find(p => p.id == permissionId);
                return permission && permission.category === category;
            });
            
            const allChecked = categoryPermissions.every(cb => cb.checked);
            checkbox.checked = allChecked;
            
            // Add event listener for category checkboxes
            checkbox.addEventListener('change', function() {
                const isChecked = this.checked;
                categoryPermissions.forEach(cb => {
                    cb.checked = isChecked;
                });
            });
            
            // Add event listeners for individual permissions
            categoryPermissions.forEach(cb => {
                cb.addEventListener('change', function() {
                    const allCheckedNow = categoryPermissions.every(cb => cb.checked);
                    checkbox.checked = allCheckedNow;
                });
            });
        });
        
    } catch (error) {
        console.error('Error populating permissions:', error);
        container.innerHTML = `
            <div class="text-center p-4 text-red-500">
                Ошибка загрузки разрешений: ${error.message}
            </div>
        `;
    }
}

// Function to save role permissions
async function saveRolePermissions() {
    if (!currentManagingRoleId) {
        console.error('No role selected for saving permissions');
        return;
    }
    
    try {
        // Get selected permissions
        const selectedPermissions = [];
        document.querySelectorAll('#modalRolePermissionsContainer input[type="checkbox"]:checked').forEach(checkbox => {
            if (!checkbox.id.startsWith('select_all_modal_')) {
                selectedPermissions.push(checkbox.value);
            }
        });
        
        console.log('Saving permissions for role:', currentManagingRoleId);
        console.log('Selected permissions:', selectedPermissions);
        
        // Get role data first
        const roleEndpoint = `${config.API_BASE_URL}${config.API_PREFIX}/roles/${currentManagingRoleId}/`;
        const roleResponse = await fetchWithAuth(roleEndpoint);
        
        if (!roleResponse.ok) {
            throw new Error(`Failed to load role data: ${roleResponse.status}`);
        }
        
        const roleData = await roleResponse.json();
        
        // Update role with new permissions
        const updateData = {
            ...roleData,
            permissions: selectedPermissions
        };
        
        // Save updated role
        const updateResponse = await fetchWithAuth(roleEndpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
            throw new Error(`Failed to update role permissions: ${updateResponse.status}`);
        }
        
        // Show success message
        showToast('Разрешения роли успешно обновлены', 'success');
        
        // Close modal
        closeRolePermissionsModal();
        
        // Reload roles to refresh data
        await loadRoles();
        
    } catch (error) {
        console.error('Error saving role permissions:', error);
        showToast(`Ошибка сохранения разрешений: ${error.message}`, 'error');
    }
}

// Function to close role permissions modal
function closeRolePermissionsModal() {
    const modal = document.getElementById('rolePermissionsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Reset current role
    currentManagingRoleId = null;
    currentManagingRoleName = '';
    currentRolePermissions = [];
}

// Expose the manage role permissions function globally
window.manageRolePermissions = manageRolePermissions;
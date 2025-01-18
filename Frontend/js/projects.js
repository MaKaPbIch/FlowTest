async function refreshAccessToken() {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) {
        throw new Error('Refresh token not found');
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh })
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        localStorage.setItem('access', data.access);
        return data.access;
    } catch (error) {
        // Удаляем токены только если не удалось их обновить
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        throw error;
    }
}

async function fetchWithAuth(url, options = {}) {
    try {
        // Добавляем токен к запросу
        const token = localStorage.getItem('access');
        if (!token) {
            // Пробуем обновить токен, если его нет
            const newToken = await refreshAccessToken();
            token = newToken;
        }

        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        let response = await fetch(url, authOptions);

        // Если получаем 401, пробуем обновить токен
        if (response.status === 401) {
            console.log('Token expired, attempting to refresh...');
            try {
                const newToken = await refreshAccessToken();
                // Повторяем запрос с новым токеном
                authOptions.headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, authOptions);
            } catch (error) {
                // Перенаправляем на страницу входа только если не удалось обновить токен
                console.error('Failed to refresh token:', error);
                window.location.href = 'http://127.0.0.1:8080/login.html';
                throw error;
            }
        }

        return response;
    } catch (error) {
        console.error('Auth error:', error);
        throw error;
    }
}

async function fetchProjects() {
    console.log('Начинаем загрузку проектов...');
    try {
        console.log('Отправляем запрос к API...');
        const response = await fetchWithAuth('http://127.0.0.1:8000/api/projects/');
        console.log('Получен ответ от API:', response);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const projects = await response.json();
        console.log('Получены проекты:', projects);
        updateProjectSelect(projects);
        updateProjectsList(projects);
    } catch (error) {
        console.error('Ошибка при получении проектов:', error);
        // Не перенаправляем здесь на логин, так как это уже обрабатывается в fetchWithAuth
    }
}

function updateProjectsList(projects) {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;

    projectsList.innerHTML = '';
    
    if (projects.length === 0) {
        projectsList.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p>${window.i18n.t('noProjects')}</p>
            </div>
        `;
        return;
    }

    projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow';
        projectCard.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">${project.name}</h3>
                    <p class="text-sm text-gray-500">${project.description || ''}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="text-blue-600 hover:text-blue-800" onclick="editProject(${project.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-800" onclick="deleteProject(${project.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="mt-4 flex justify-between text-sm text-gray-500">
                <span>${project.test_cases_count || 0} tests</span>
                <span>Created: ${new Date(project.created_at).toLocaleDateString()}</span>
            </div>
        `;
        projectsList.appendChild(projectCard);
    });
}

async function fetchProjects() {
    try {
        const response = await fetchWithAuth('http://127.0.0.1:8000/api/projects/');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const projects = await response.json();
        updateProjectSelect(projects);
        return projects;
    } catch (error) {
        console.error('Error fetching projects:', error);
    }
}

function updateProjectSelect(projects) {
    const selectElement = document.getElementById('projectSelector');
    if (!selectElement) {
        console.error('Project selector not found');
        return;
    }

    selectElement.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = window.i18n.t('selectProject');
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selectElement.appendChild(defaultOption);

    if (Array.isArray(projects) && projects.length > 0) {
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            selectElement.appendChild(option);
        });
    }

    // Восстанавливаем выбранный проект
    const savedProject = localStorage.getItem('selectedProject');
    if (savedProject) {
        selectElement.value = savedProject;
    }

    selectElement.addEventListener('change', function() {
        if (this.value) {
            localStorage.setItem('selectedProject', this.value);
            // Обновляем графики при смене проекта
            if (window.dashboardManager) {
                window.dashboardManager.updateCharts();
            }
        }
    });
}

async function createProject(event) {
    event.preventDefault();
    
    const projectNameInput = document.getElementById('projectName');
    const projectDescriptionInput = document.getElementById('projectDescription');
    const createProjectModal = document.getElementById('createProjectModal');
    
    const projectData = {
        name: projectNameInput.value.trim(),
        description: projectDescriptionInput.value.trim()
    };

    try {
        const response = await fetchWithAuth('http://127.0.0.1:8000/api/projects/', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });

        if (!response.ok) {
            throw new Error('Failed to create project');
        }

        const newProject = await response.json();
        
        // Показываем уведомление об успехе
        showNotification(
            window.i18n.t('projectCreated'),
            'success'
        );

        // Закрываем модальное окно
        createProjectModal.classList.add('hidden');
        
        // Очищаем форму
        projectNameInput.value = '';
        projectDescriptionInput.value = '';

        // Обновляем список проектов
        await fetchProjects();

    } catch (error) {
        console.error('Error creating project:', error);
        showNotification(
            window.i18n.t('projectCreationError'),
            'error'
        );
    }
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white min-w-[300px] z-50`;
    
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function loadProjects() {
    const projectsContainer = document.getElementById('projects-container');
    if (projectsContainer) {
        projectsContainer.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading projects...</div>';
    }
    
    await fetchProjects();
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    
    // Привязываем обработчик к форме создания проекта
    const createProjectForm = document.getElementById('createProjectForm');
    if (createProjectForm) {
        createProjectForm.addEventListener('submit', createProject);
    }
});

console.log('projects.js загружен');

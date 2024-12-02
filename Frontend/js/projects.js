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
    } catch (error) {
        console.error('Ошибка при получении проектов:', error);
        // Не перенаправляем здесь на логин, так как это уже обрабатывается в fetchWithAuth
    }
}

function updateProjectSelect(projects) {
    console.log('Обновляем select элемент...');
    const selectElement = document.getElementById('projectSelector');
    console.log('Найден select элемент:', selectElement);
    
    if (!selectElement) {
        console.error('Select element not found');
        return;
    }

    // Сохраняем текущее выбранное значение
    const currentValue = selectElement.value;

    // Очищаем текущие опции, оставляя только первую (Все проекты)
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }

    // Добавляем новые опции
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        selectElement.appendChild(option);
    });

    // Восстанавливаем выбранное значение, если оно существует в новом списке
    if (currentValue && Array.from(selectElement.options).some(opt => opt.value === currentValue)) {
        selectElement.value = currentValue;
    }

    // Вызываем событие change для обновления отображения
    selectElement.dispatchEvent(new Event('change'));
}

// Инициализация обработчика событий
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, начинаем инициализацию...');
    fetchProjects();

    // Добавляем обработчик изменения выбранного проекта
    const projectSelector = document.getElementById('projectSelector');
    if (projectSelector) {
        projectSelector.addEventListener('change', async (event) => {
            const selectedProjectId = event.target.value;
            
            // Сохраняем выбранный проект в localStorage
            if (selectedProjectId) {
                localStorage.setItem('selectedProjectId', selectedProjectId);
                // Генерируем событие для других страниц
                window.dispatchEvent(new Event('storage'));
            } else {
                localStorage.removeItem('selectedProjectId');
            }

            try {
                // Получаем все проекты
                const response = await fetchWithAuth('http://127.0.0.1:8000/api/projects/');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const projects = await response.json();
                
                // Фильтруем проекты если выбран конкретный проект
                const filteredProjects = selectedProjectId 
                    ? projects.filter(project => project.id.toString() === selectedProjectId)
                    : projects;
                
                // Обновляем отображение проектов
                updateProjectDisplay(filteredProjects);
            } catch (error) {
                console.error('Ошибка при обновлении проектов:', error);
            }
        });
    }
});

// Функция для обновления отображения проектов
function updateProjectDisplay(projects) {
    // Здесь добавьте код для обновления отображения проектов на странице
    // Например, обновление графиков, таблиц или других элементов
    console.log('Обновление отображения проектов:', projects);
}

console.log('projects.js загружен');

// Функция для обновления аватара пользователя
function updateUserAvatar(avatarElement, user) {
    if (!avatarElement) {
        console.error('Avatar element not found');
        return;
    }

    console.log('Updating avatar for user:', user);
    
    // Проверяем оба поля для аватара (avatar и avatar_url) и используем любое непустое значение
    const avatarUrl = user.avatar_url || user.avatar;
    console.log('Avatar URL from any field:', avatarUrl);

    // Проверяем наличие аватара в профиле
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined') {
        // Формируем полный URL для аватара
        const fullAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `${config.API_BASE_URL}${avatarUrl}`;
        console.log('Full avatar URL:', fullAvatarUrl);
        
        // Создаем изображение и обрабатываем ошибки загрузки
        const img = new Image();
        img.onload = function() {
            avatarElement.innerHTML = `<img src="${fullAvatarUrl}" class="w-8 h-8 rounded-full object-cover" alt="User avatar">`;
        };
        img.onerror = function() {
            console.error('Failed to load avatar image:', fullAvatarUrl);
            // Показываем инициалы при ошибке загрузки
            const initials = user.username.charAt(0).toUpperCase();
            avatarElement.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-coral-500 flex items-center justify-center text-white">
                    ${initials}
                </div>
            `;
        };
        img.src = fullAvatarUrl;
    } else {
        console.log('No avatar URL, showing initials');
        // Если аватара нет, показываем инициалы
        const initials = user.username.charAt(0).toUpperCase();
        avatarElement.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-coral-500 flex items-center justify-center text-white">
                ${initials}
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Инициализируем компоненты
        await initializeComponents();
        
        // Загружаем начальные данные
        await loadInitialData();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Инициализация компонентов
async function initializeComponents() {
    // Инициализация темы
    if (window.themeManager) {
        window.themeManager.init();
    } else {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
    
    // Инициализация других компонентов
    if (window.initializeProjectSelector) {
        window.initializeProjectSelector();
    }
    
    // Загружаем данные пользователя, если функция существует
    if (typeof loadUserData === 'function') {
        const userData = await loadUserData();
        if (userData) {
            const avatarElement = document.getElementById('user-avatar');
            const userNameElement = document.getElementById('userName');
            
            if (avatarElement) {
                updateUserAvatar(avatarElement, userData);
            }
            
            if (userNameElement) {
                userNameElement.textContent = userData.username;
            }
        }
    }
}

// Загрузка начальных данных
async function loadInitialData() {
    try {
        // Получаем выбранный проект
        const projectSelector = document.getElementById('projectSelector');
        const selectedProject = projectSelector ? projectSelector.value : null;
        
        // Если проект выбран, загружаем статистику
        if (selectedProject) {
            console.log('Loading data for project:', selectedProject);
            if (typeof window.fetchData === 'function') {
                await window.fetchData(selectedProject);
            } else {
                console.log('fetchData function not available on this page');
            }
        } else {
            console.log('No project selected');
            // Загружаем список проектов
            await loadProjects();
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
        throw error;
    }
}

// Загрузка проектов
async function loadProjects() {
    console.log('Loading projects...');
    // Fix: Remove API_PREFIX as ENDPOINTS already contains /api/
    const apiUrl = `${config.API_BASE_URL}${config.ENDPOINTS.PROJECTS}`;
    console.log('API URL:', apiUrl);

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Projects response status:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const projects = await response.json();
        console.log('Projects loaded:', projects);

        // Обновляем селектор проектов
        const projectSelector = document.getElementById('projectSelector');
        if (projectSelector) {
            projectSelector.innerHTML = '';
            
            // Добавляем опцию "Выберите проект"
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = t('selectProject');
            projectSelector.appendChild(defaultOption);
            
            // Добавляем проекты
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                projectSelector.appendChild(option);
            });

            // Если есть проекты, выбираем первый и загружаем его данные
            if (projects.length > 0) {
                projectSelector.value = projects[0].id;
                // Проверяем, доступна ли функция fetchData
                if (typeof window.fetchData === 'function') {
                    window.fetchData(projects[0].id);
                } else {
                    console.error('Error: window.fetchData is not a function');
                }
            }
        }

        return projects;
    } catch (error) {
        console.error('Error loading projects:', error);
        throw error;
    }
}

// Делаем функцию доступной глобально
window.updateUserAvatar = updateUserAvatar;

async function refreshToken() {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch(config.API_BASE_URL + config.ENDPOINTS.AUTH.REFRESH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        console.log('Token refreshed successfully');
        
        // Обновляем токены
        localStorage.setItem('access', data.access);
        if (data.refresh) {
            localStorage.setItem('refresh', data.refresh);
        }
        
        return data.access;
    } catch (error) {
        console.error('Error refreshing token:', error);
        // При ошибке обновления токена, очищаем хранилище и перенаправляем на страницу входа
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

async function login(username, password) {
    try {
        const response = await fetch(config.API_BASE_URL + config.ENDPOINTS.AUTH.LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();
        
        // Сохраняем токены
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        
        // Получаем данные пользователя
        const userResponse = await fetch(config.API_BASE_URL + config.ENDPOINTS.USERS.PROFILE, {
            headers: {
                'Authorization': `Bearer ${data.access}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (userResponse.ok) {
            const userData = await userResponse.json();
            localStorage.setItem('user', JSON.stringify(userData));
        }

        // Перенаправляем на главную страницу
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Функция для выполнения запросов с авторизацией
async function fetchWithAuth(url, options = {}) {
    // Базовые заголовки
    const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
    };
    
    // Добавляем JWT токен, если он есть
    const access = localStorage.getItem('access');
    if (access) {
        headers['Authorization'] = `Bearer ${access}`;
    }
    
    // Формируем полный URL с учетом слеша
    let fullUrl;
    if (url.startsWith('http')) {
        fullUrl = url;
    } else {
        // Make sure we don't double up on slashes
        const apiPrefix = '/api'; // Используем статический префикс вместо config.API_PREFIX
        if (url.startsWith('/')) {
            fullUrl = `${config.API_BASE_URL}${apiPrefix}${url}`;
        } else {
            fullUrl = `${config.API_BASE_URL}${apiPrefix}/${url}`;
        }
    }
    
    console.log('API Request:', fullUrl, options.method || 'GET');
    
    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers,
            credentials: 'include'  // Важно для работы с сессионными куками
        });
        
        // Если ошибка авторизации и есть JWT токен, пробуем его обновить
        if (response.status === 401 && access) {
            console.log('Получен 401, пробуем обновить токен...');
            try {
                const newAccess = await refreshToken();
                headers['Authorization'] = `Bearer ${newAccess}`;
                console.log('Токен обновлен, повторяем запрос...');
                return await fetch(fullUrl, {
                    ...options,
                    headers,
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Не удалось обновить токен:', error);
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                // Перенаправляем на страницу логина, если мы не на ней
                if (!window.location.href.includes('login.html')) {
                    window.location.href = '/login.html';
                }
                throw new Error(`Ошибка авторизации: ${error.message}`);
            }
        }
        
        if (!response.ok) {
            console.error('API ответил ошибкой:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });
        }
        
        return response;
    } catch (error) {
        console.error('Ошибка запроса:', error.name, error.message);
        console.error('URL запроса:', fullUrl);
        console.error('Метод запроса:', options.method || 'GET');
        throw new Error(`Сетевая ошибка: ${error.message}`);
    }
}

// Проверяем токен при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    const access = localStorage.getItem('access');
    if (!access) {
        const refresh = localStorage.getItem('refresh');
        if (refresh) {
            try {
                await refreshToken();
            } catch (error) {
                console.error('Failed to refresh token on page load:', error);
            }
        }
    }
});

// Автоматическое обновление токена каждые 4 минуты
setInterval(refreshToken, config.TOKEN_REFRESH_INTERVAL);

// Экспортируем функции для использования в других файлах
window.login = login;
window.refreshToken = refreshToken;
window.fetchWithAuth = fetchWithAuth;

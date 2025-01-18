async function refreshToken() {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        
        // Обновляем токен
        localStorage.setItem('access', data.access);
        
        // Обновляем данные пользователя, если они пришли
        if (data.user) {
            // Добавляем базовый URL к аватару, если он есть
            if (data.user.avatar) {
                data.user.avatar = `http://127.0.0.1:8000${data.user.avatar}`;
            }
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        return data.access;
    } catch (error) {
        console.error(error);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// Автоматическое обновление токена каждые 55 минут
setInterval(refreshToken, 55 * 60 * 1000);

async function login(username, password) {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        
        // Добавляем базовый URL к аватару, если он есть
        if (data.user && data.user.avatar) {
            data.user.avatar = `http://127.0.0.1:8000${data.user.avatar}`;
        }

        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Экспортируем функции для использования в других файлах
window.login = login;
window.refreshToken = refreshToken;

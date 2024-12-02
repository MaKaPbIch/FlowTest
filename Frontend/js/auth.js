async function refreshToken() {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) {
        window.location.href = 'http://127.0.0.1:8080/login.html';
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
        localStorage.setItem('access', data.access);
    } catch (error) {
        console.error(error);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = 'http://127.0.0.1:8080/login.html';
    }
}

// Автоматическое обновление токена каждые 55 минут
setInterval(refreshToken, 55 * 60 * 1000);

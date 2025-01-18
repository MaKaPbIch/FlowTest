// Немедленно получаем и применяем тему с сервера
(async function() {
    try {
        // Проверяем, есть ли токен доступа
        const token = localStorage.getItem('access');
        if (!token) return;

        // Получаем тему с сервера
        const response = await fetch('http://127.0.0.1:8000/api/users/get_current_user/', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.theme) {
                localStorage.setItem('theme', data.theme);
                document.documentElement.classList.toggle('dark', data.theme === 'dark');
                return;
            }
        }
    } catch (error) {
        console.error('Error fetching theme:', error);
    }

    // Если что-то пошло не так, используем тему из localStorage
    const localTheme = localStorage.getItem('theme');
    if (localTheme) {
        document.documentElement.classList.toggle('dark', localTheme === 'dark');
    }
})(); 
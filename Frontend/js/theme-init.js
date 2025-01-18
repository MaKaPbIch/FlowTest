// Немедленно применяем тему из localStorage при загрузке
(function() {
    const theme = localStorage.getItem('theme');
    if (theme) {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }
})();

// После загрузки DOM проверяем тему на сервере
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetchWithAuth('http://127.0.0.1:8000/api/users/get_current_user/');
        if (!response.ok) throw new Error('Failed to fetch theme');
        
        const data = await response.json();
        const serverTheme = data.theme;
        
        if (serverTheme) {
            localStorage.setItem('theme', serverTheme);
            document.documentElement.classList.toggle('dark', serverTheme === 'dark');
            
            // Обновляем состояние переключателя если он есть
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.checked = serverTheme === 'dark';
            }
        }
    } catch (error) {
        console.error('Error fetching theme from server:', error);
    }
}); 
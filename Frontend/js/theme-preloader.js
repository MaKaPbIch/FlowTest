(function() {
    // Функция получения текущей темы
    function getPreloadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return savedTheme || 'dark';
    }

    // Применяем тему немедленно
    const theme = getPreloadTheme();
    document.documentElement.classList.add(theme);
    if (document.body) document.body.classList.add(theme);
})(); 
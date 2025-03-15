// Проверяем, не определен ли уже ThemeManager
if (typeof window.ThemeManager === 'undefined') {
    class ThemeManager {
        constructor() {
            this.theme = localStorage.getItem('theme') || config.DEFAULT_THEME;
            this.init();
        }

        init() {
            // Применяем тему при инициализации
            this.applyTheme(this.theme);
            
            // Добавляем слушатель для переключения темы
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => this.toggleTheme());
            }
        }

        applyTheme(theme) {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            
            // Сохраняем тему в localStorage
            localStorage.setItem('theme', theme);
            this.theme = theme;
            
            // Обновляем иконку переключателя
            this.updateToggleIcon();
        }

        toggleTheme() {
            const newTheme = this.theme === 'dark' ? 'light' : 'dark';
            this.applyTheme(newTheme);
        }

        updateToggleIcon() {
            const themeToggleIcon = document.getElementById('theme-toggle-icon');
            if (themeToggleIcon) {
                if (this.theme === 'dark') {
                    themeToggleIcon.classList.remove('fa-moon');
                    themeToggleIcon.classList.add('fa-sun');
                } else {
                    themeToggleIcon.classList.remove('fa-sun');
                    themeToggleIcon.classList.add('fa-moon');
                }
            }
        }

        getCurrentTheme() {
            return this.theme;
        }
    }

    // Создаем глобальный экземпляр ThemeManager
    window.themeManager = new ThemeManager();
}

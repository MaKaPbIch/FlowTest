// Модуль управления настройками
const SettingsManager = {
    // Состояние
    state: {
        isChangingLanguage: false,
        currentLanguage: localStorage.getItem('language') || 'en',
        currentTheme: localStorage.getItem('theme') || 'system'
    },

    // Инициализация
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initLanguage();
            this.initTheme();
            this.bindEvents();
        });
    },

    // Инициализация языка
    async initLanguage() {
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            const currentLang = localStorage.getItem('language') || 'en';
            languageSelect.value = currentLang;
            this.updateFlag(currentLang);
            try {
                await i18n.loadTranslations(currentLang);
                i18n.applyTranslations();
            } catch (error) {
                console.error('Error initializing language:', error);
                this.showNotification(i18n.t('loadingTranslationsError'), 'error');
            }
        }
    },

    // Инициализация темы
    initTheme() {
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            const currentTheme = localStorage.getItem('theme') || 'system';
            themeSelect.value = currentTheme;
            this.applyTheme(currentTheme);
        }
    },

    // Применение темы
    applyTheme(theme) {
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
        this.state.currentTheme = theme;
    },

    // Привязка обработчиков событий
    bindEvents() {
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                const newLang = e.target.value;
                this.changeLanguage(newLang);
            });
        }

        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                const newTheme = e.target.value;
                this.applyTheme(newTheme);
            });
        }

        // Слушаем изменения системной темы
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.state.currentTheme === 'system') {
                this.applyTheme('system');
            }
        });
    },

    // Обновление флага
    updateFlag(lang) {
        const flagElement = document.getElementById('selectedFlag');
        if (flagElement) {
            // Очищаем все классы fi-*
            flagElement.className = flagElement.className.split(' ').filter(c => !c.startsWith('fi-')).join(' ');
            // Добавляем класс флага
            flagElement.classList.add('fi');
            switch (lang) {
                case 'en':
                    flagElement.classList.add('fi-gb');
                    break;
                case 'ru':
                    flagElement.classList.add('fi-ru');
                    break;
                case 'de':
                    flagElement.classList.add('fi-de');
                    break;
            }
        }
    },

    // Смена языка
    async changeLanguage(lang) {
        if (this.state.isChangingLanguage) return;
        this.state.isChangingLanguage = true;

        try {
            await i18n.loadTranslations(lang);
            localStorage.setItem('language', lang);
            this.state.currentLanguage = lang;
            this.updateFlag(lang);
            i18n.applyTranslations();
            this.showNotification(i18n.t('languageChangeSuccess'), 'success');
        } catch (error) {
            console.error('Error changing language:', error);
            this.showNotification(i18n.t('languageChangeError'), 'error');
        } finally {
            this.state.isChangingLanguage = false;
        }
    },

    // Показ уведомлений
    showNotification(message, type = 'info') {
        // Здесь можно добавить код для показа уведомлений
        console.log(`[${type}] ${message}`);
    },

    // Навигация назад
    goBack() {
        window.location.href = '/index.html';
    }
};

// Делаем функцию доступной глобально
window.goBack = function() {
    window.location.href = '/index.html';
};

// Инициализация
console.log('Initializing SettingsManager');
SettingsManager.init();

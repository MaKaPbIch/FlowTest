const translations = {
    'en': {
        'dashboard': 'Test Management Dashboard',
        'testcases': 'Test Cases',
        'settings': 'Settings',
        'theme': 'Theme',
        'language': 'Language',
        'dark_mode': 'Dark Mode',
        'light_mode': 'Light Mode',
        'english': 'English',
        'russian': 'Russian',
        'save': 'Save',
        'cancel': 'Cancel',
        'settings_saved': 'Settings saved successfully',
        'error_saving': 'Error saving settings',
        'confirm': 'Confirm',
        'delete': 'Delete',
        'edit': 'Edit',
        'add': 'Add',
        'search': 'Search',
        'no_results': 'No results found',
        'loading': 'Loading...',
        'welcome': 'Welcome to FlowTest',
        'logout': 'Logout',
        'profile': 'Profile'
    },
    'ru': {
        'dashboard': 'Панель управления тестами',
        'testcases': 'Тестовые случаи',
        'settings': 'Настройки',
        'theme': 'Тема',
        'language': 'Язык',
        'dark_mode': 'Темная тема',
        'light_mode': 'Светлая тема',
        'english': 'Английский',
        'russian': 'Русский',
        'save': 'Сохранить',
        'cancel': 'Отмена',
        'settings_saved': 'Настройки успешно сохранены',
        'error_saving': 'Ошибка при сохранении настроек',
        'confirm': 'Подтвердить',
        'delete': 'Удалить',
        'edit': 'Редактировать',
        'add': 'Добавить',
        'search': 'Поиск',
        'no_results': 'Результаты не найдены',
        'loading': 'Загрузка...',
        'welcome': 'Добро пожаловать в FlowTest',
        'logout': 'Выйти',
        'profile': 'Профиль'
    }
};

function isLoginPage() {
    return window.location.pathname.includes('login.html');
}

function getDefaultLanguage() {
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
        console.log('Using saved language:', savedLang);
        return savedLang;
    }
    return 'en';
}

async function getCurrentLanguage() {
    try {
        console.log('Fetching language from server...');
        if (isLoginPage()) {
            return getDefaultLanguage();
        }

        const response = await fetchWithAuth('http://127.0.0.1:8000/api/users/get_current_user/');
        
        if (!response.ok) {
            throw new Error('Failed to fetch language');
        }
        
        const data = await response.json();
        console.log('Language from server:', data.language);
        const lang = data.language || getDefaultLanguage();
        localStorage.setItem('language', lang);
        return lang;
    } catch (error) {
        console.error('Error fetching language:', error);
        return getDefaultLanguage();
    }
}

async function setLanguage(lang) {
    try {
        console.log('Setting language:', lang);
        localStorage.setItem('language', lang);
        
        if (isLoginPage()) {
            await loadTranslations(lang);
            await translatePage();
            return true;
        }

        const response = await fetchWithAuth('http://127.0.0.1:8000/api/users/language/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                language: lang
            }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to update language');
        }
        
        await loadTranslations(lang);
        await translatePage();
        return true;
    } catch (error) {
        console.error('Error updating language:', error);
        // В случае ошибки все равно пытаемся обновить язык локально
        try {
            await loadTranslations(lang);
            await translatePage();
        } catch (translationError) {
            console.error('Error applying translations:', translationError);
        }
        return false;
    }
}

async function loadTranslations(lang) {
    try {
        const response = await fetch(`/locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load translations for ${lang}`);
        }
        window.translations = await response.json();
    } catch (error) {
        console.error('Error loading translations:', error);
        // Если не удалось загрузить перевод, используем английский как запасной вариант
        if (lang !== 'en') {
            await loadTranslations('en');
        }
    }
}

async function translatePage() {
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (window.translations && window.translations[key]) {
            element.textContent = window.translations[key];
        }
    });
}

async function initializeI18n() {
    try {
        const lang = await getCurrentLanguage();
        await loadTranslations(lang);
        await translatePage();
    } catch (error) {
        console.error('Error initializing i18n:', error);
        // В случае ошибки используем английский язык
        try {
            await loadTranslations('en');
            await translatePage();
        } catch (fallbackError) {
            console.error('Error loading fallback translations:', fallbackError);
        }
    }
}

// Initialize i18n when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeI18n);
} else {
    initializeI18n();
}

// Export functions for use in other files
window.setLanguage = setLanguage;
window.getCurrentLanguage = getCurrentLanguage;

// Notification functions
function showNotification(message = 'Settings saved successfully!') {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-500';
    notification.textContent = message;
    document.body.appendChild(notification);

    if (window.timeoutId) {
        clearTimeout(window.timeoutId);
    }

    window.timeoutId = setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function hideNotification() {
    const notification = document.querySelector('.fixed.bottom-4.right-4');
    if (notification) {
        notification.remove();
    }
}

// Show/hide sections
function showRoles() {
    document.getElementById('general').classList.add('hidden');
    document.getElementById('roles').classList.remove('hidden');
}

function showGeneral() {
    document.getElementById('roles').classList.add('hidden');
    document.getElementById('general').classList.remove('hidden');
}

function goBack() {
    window.history.back();
}

// Theme toggle handler
async function handleDarkModeToggle() {
    const isDark = await toggleDarkMode();
    showNotification(isDark ? 'Dark mode enabled' : 'Light mode enabled');
}

// Language change handler
async function handleLanguageChange(event) {
    const success = await setLanguage(event.target.value);
    if (success) {
        showNotification('Language changed successfully');
    }
}

// Initialize settings
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Add event listener for General tab
        const generalTab = document.querySelector('a[href="#general"]');
        if (generalTab) {
            generalTab.addEventListener('click', (e) => {
                e.preventDefault();
                showGeneral();
            });
        }

        // Add event listener for Roles tab
        const rolesTab = document.querySelector('a[href="#roles"]');
        if (rolesTab) {
            rolesTab.addEventListener('click', (e) => {
                e.preventDefault();
                showRoles();
            });
        }

        // Add event listener for language change
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.addEventListener('change', handleLanguageChange);
        }

        // Initialize theme toggle button state
        const isDark = await isDarkMode();
        updateToggleButton(isDark);

        // Initialize language select
        const currentLang = localStorage.getItem('language') || 'en';
        if (languageSelect) {
            languageSelect.value = currentLang;
        }
    } catch (error) {
        console.error('Error initializing settings:', error);
    }
});

// Инициализация настроек при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeSettings);

// Функция инициализации настроек
async function initializeSettings() {
    // Проверяем наличие токена
    const token = localStorage.getItem('token');
    
    if (token) {
        try {
            // Загружаем язык с сервера
            const response = await fetchWithAuth('http://127.0.0.1:8000/api/users/language/');
            const data = await response.json();
            if (data.language) {
                await applyLanguage(data.language);
            }
        } catch (error) {
            console.error('Error loading user settings:', error);
            // Если не удалось загрузить с сервера, используем локальные настройки
            const savedLang = localStorage.getItem('language') || 'en';
            await applyLanguage(savedLang);
        }
    } else {
        // Если пользователь не авторизован, используем локальные настройки
        const savedLang = localStorage.getItem('language') || 'en';
        await applyLanguage(savedLang);
    }

    // Применяем тему
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        enableDarkMode();
    }
}

// Включение темной темы
function enableDarkMode() {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', 'true');
}

// Отключение темной темы
function disableDarkMode() {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', 'false');
}

// Переключение темной темы
async function toggleDarkMode() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    if (isDarkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }

    // Если пользователь авторизован, синхронизируем с сервером
    const token = localStorage.getItem('token');
    if (token) {
        try {
            await updateUserSettings({ darkMode: !isDarkMode });
        } catch (error) {
            console.error('Error saving dark mode setting:', error);
        }
    }
}

// Применение языка
async function applyLanguage(lang) {
    if (!['en', 'ru', 'de'].includes(lang)) {
        console.error('Invalid language:', lang);
        return;
    }

    localStorage.setItem('language', lang);
    const translations = await loadTranslations(lang);
    updateUITexts(translations);

    // Если пользователь авторизован, синхронизируем с сервером
    const token = localStorage.getItem('token');
    if (token) {
        try {
            await updateUserLanguage(lang);
        } catch (error) {
            console.error('Error updating language:', error);
        }
    }
}

// Загрузка переводов
async function loadTranslations(lang) {
    try {
        const response = await fetch(`/locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load translations for ${lang}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading translations for ${lang}:`, error);
        // В случае ошибки загрузки, попробуем использовать английский как запасной вариант
        if (lang !== 'en') {
            console.log('Falling back to English translations');
            return loadTranslations('en');
        }
        return {};
    }
}

// Обновление текстов в UI
function updateUITexts(translations) {
    if (!translations) return;

    // Обновляем элементы с атрибутом data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            // Для input type="submit" используем value
            if (element.tagName.toLowerCase() === 'input' && element.type === 'submit') {
                element.value = translations[key];
            }
            // Для кнопок и ссылок сохраняем внутренние элементы
            else if (element.tagName.toLowerCase() === 'button' || element.tagName.toLowerCase() === 'a') {
                const img = element.querySelector('img');
                const svg = element.querySelector('svg');
                element.textContent = translations[key];
                if (img) element.prepend(img);
                if (svg) element.appendChild(svg);
            }
            // Для остальных элементов просто обновляем текст
            else {
                element.textContent = translations[key];
            }
        }
    });

    // Обновляем плейсхолдеры
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            element.placeholder = translations[key];
        }
    });

    // Обновляем title атрибуты
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        if (translations[key]) {
            element.title = translations[key];
        }
    });

    // Обновляем aria-label атрибуты
    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
        const key = element.getAttribute('data-i18n-aria-label');
        if (translations[key]) {
            element.setAttribute('aria-label', translations[key]);
        }
    });
}

// Функция для загрузки текущего языка пользователя
async function loadUserLanguage() {
    try {
        const response = await fetchWithAuth('http://127.0.0.1:8000/api/users/language/');
        const data = await response.json();
        return data.language || 'en';
    } catch (error) {
        console.error('Error loading user language:', error);
        return localStorage.getItem('language') || 'en';
    }
}

// Функция для обновления языка пользователя
async function updateUserLanguage(language) {
    try {
        const response = await fetchWithAuth('http://127.0.0.1:8000/api/users/language/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ language }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating user language:', error);
        throw error;
    }
}

// Функция для обновления настроек пользователя
async function updateUserSettings(settings) {
    try {
        const response = await fetchWithAuth('http://127.0.0.1:8000/api/users/update_user_info/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating user settings:', error);
        throw error;
    }
}

// Функция для установки языка
async function setLanguage(lang) {
    try {
        await applyLanguage(lang);
        return true;
    } catch (error) {
        console.error('Error setting language:', error);
        return false;
    }
}

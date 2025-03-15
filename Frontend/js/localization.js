// Текущий язык
let currentLanguage = 'en';

// Объект с переводами
const translations = {
    en: {
        "Profile Settings": "Profile Settings",
        "Username": "Username",
        "First Name": "First Name",
        "Last Name": "Last Name",
        "Email": "Email",
        "Bio": "Bio",
        "Save Changes": "Save Changes",
        "Cancel": "Cancel",
        "Change Password": "Change Password",
        "Current Password": "Current Password",
        "New Password": "New Password",
        "Confirm Password": "Confirm New Password",
        "Allowed formats: JPG, PNG, GIF": "Allowed formats: JPG, PNG, GIF"
    },
    ru: {
        "Profile Settings": "Настройки профиля",
        "Username": "Имя пользователя",
        "First Name": "Имя",
        "Last Name": "Фамилия",
        "Email": "Email",
        "Bio": "О себе",
        "Save Changes": "Сохранить изменения",
        "Cancel": "Отмена",
        "Change Password": "Изменить пароль",
        "Current Password": "Текущий пароль",
        "New Password": "Новый пароль",
        "Confirm Password": "Подтвердите пароль",
        "Allowed formats: JPG, PNG, GIF": "Допустимые форматы: JPG, PNG, GIF"
    }
};

// Функция для получения перевода
function t(key) {
    if (!translations[currentLanguage] || !translations[currentLanguage][key]) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
    }
    return translations[currentLanguage][key];
}

// Функция для установки языка
async function setLanguage(lang) {
    if (!translations[lang]) {
        console.error(`Language ${lang} not supported`);
        return;
    }

    try {
        // Отправляем запрос на сервер для обновления языка пользователя
        const response = await fetchWithAuth('http://127.0.0.1:8000/api/users/language/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ language: lang })
        });

        if (response.ok) {
            currentLanguage = lang;
            // Обновляем все переводы на странице
            updatePageTranslations();
            return true;
        } else {
            console.error('Failed to update language on server');
            return false;
        }
    } catch (error) {
        console.error('Error updating language:', error);
        return false;
    }
}

// Функция для получения текущего языка с сервера
async function getCurrentLanguage() {
    try {
        const response = await fetchWithAuth('/api/users/language/');
        if (response.status === 404) {
            console.warn('Language endpoint not found, using default language');
            currentLanguage = navigator.language.split('-')[0] || 'en';
            updatePageTranslations();
            return;
        }
        if (response.ok) {
            const data = await response.json();
            currentLanguage = data.language;
            updatePageTranslations();
        }
    } catch (error) {
        console.error('Error getting current language:', error);
    }
}

// Функция для обновления всех переводов на странице
function updatePageTranslations() {
    // Обновляем все элементы с атрибутом data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = t(key);
        } else {
            element.textContent = t(key);
        }
    });

    // Обновляем все элементы с атрибутом data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
}

// Инициализация локализации при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    getCurrentLanguage();
});

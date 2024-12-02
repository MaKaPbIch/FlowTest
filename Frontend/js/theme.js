// Конфигурация Tailwind для темной темы
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                coral: {
                    50: '#FFF0EB',
                    100: '#FFE1D6',
                    200: '#FFC3B3',
                    300: '#FFA590',
                    400: '#FF876D',
                    500: '#FF7F50',
                    600: '#FF6347',
                    700: '#FF4733',
                    800: '#FF2B20',
                    900: '#FF0F0D',
                },
            },
        },
    },
}

// Theme management functions
async function getThemeFromServer() {
    try {
        console.log('Fetching theme from server...');
        if (isLoginPage()) {
            return getDefaultTheme();
        }

        const response = await fetchWithAuth('http://127.0.0.1:8000/api/users/get_current_user/');
        
        if (!response.ok) {
            throw new Error('Failed to fetch theme');
        }
        
        const data = await response.json();
        console.log('Theme from server:', data.theme);
        const theme = data.theme || getDefaultTheme();
        localStorage.setItem('theme', theme);
        return theme;
    } catch (error) {
        console.error('Error fetching theme:', error);
        return getDefaultTheme();
    }
}

function getDefaultTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        console.log('Using saved theme:', savedTheme);
        return savedTheme;
    }
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('Using system preference:', systemPrefersDark ? 'dark' : 'light');
    return systemPrefersDark ? 'dark' : 'light';
}

function isLoginPage() {
    return window.location.pathname.includes('login.html');
}

async function setThemeOnServer(isDark) {
    console.log('setThemeOnServer called with isDark:', isDark);
    // Сохраняем тему локально в любом случае
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);

    // Если это страница логина, не отправляем на сервер
    if (isLoginPage()) {
        console.log('On login page, skipping server update');
        return;
    }

    try {
        console.log('Preparing to send request to server...');
        const response = await fetchWithAuth('http://127.0.0.1:8000/api/users/update_theme/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                theme: theme
            })
        });
        console.log('Request sent, response status:', response.status);

        if (!response.ok) {
            throw new Error('Failed to update theme on server');
        }

        const data = await response.json();
        console.log('Server response data:', data);
    } catch (error) {
        console.error('Error in setThemeOnServer:', error);
        throw error;
    }
}

function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

async function toggleDarkMode() {
    console.log('toggleDarkMode called');
    const isDark = !isDarkMode();
    console.log('Current isDark state:', isDark);
    
    try {
        console.log('Attempting to update theme on server...');
        // Сначала отправляем на сервер
        await setThemeOnServer(isDark);
        console.log('Server update successful');
        
        // После успешного обновления на сервере меняем UI
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Обновляем состояние кнопки
        const updateToggleButton = window.updateToggleButton;
        if (typeof updateToggleButton === 'function') {
            updateToggleButton(isDark);
        }

        // Показываем уведомление об успехе
        const showNotification = window.showNotification;
        if (typeof showNotification === 'function') {
            showNotification('Theme updated successfully', 'success');
        }
    } catch (error) {
        console.error('Error in toggleDarkMode:', error);
        const showNotification = window.showNotification;
        if (typeof showNotification === 'function') {
            showNotification('Failed to update theme', 'error');
        }
    }
}

function toggleTheme() {
    const currentTheme = localStorage.getItem('theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    setThemeOnServer(newTheme === 'dark');
}

function applyStoredTheme() {
    const storedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', storedTheme === 'dark');
}

async function initializeTheme() {
    try {
        const theme = await getThemeFromServer();
        document.documentElement.classList.toggle('dark', theme === 'dark');
    } catch (error) {
        console.error('Error initializing theme:', error);
    }
}

// Initialize theme when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeTheme();
        applyStoredTheme();
    });
} else {
    initializeTheme();
    applyStoredTheme();
}

// Export functions for use in other files
window.toggleDarkMode = toggleDarkMode;
window.isDarkMode = isDarkMode;
window.setThemeOnServer = setThemeOnServer;
window.toggleTheme = toggleTheme;
window.applyStoredTheme = applyStoredTheme;

// Функция для обновления аватара пользователя
function updateUserAvatar(avatarElement, user) {
    if (!avatarElement) {
        console.error('Avatar element not found');
        return;
    }

    console.log('Updating avatar for user:', user);
    console.log('Avatar URL:', user.avatar);

    // Проверяем наличие аватара в профиле
    const avatarUrl = user.avatar;
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined') {
        // Формируем полный URL для аватара
        const fullAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `http://127.0.0.1:8000${avatarUrl}`;
        console.log('Full avatar URL:', fullAvatarUrl);
        
        // Создаем изображение и обрабатываем ошибки загрузки
        const img = new Image();
        img.onload = function() {
            avatarElement.innerHTML = `<img src="${fullAvatarUrl}" class="w-8 h-8 rounded-full object-cover" alt="User avatar">`;
        };
        img.onerror = function() {
            console.error('Failed to load avatar image:', fullAvatarUrl);
            // Показываем инициалы при ошибке загрузки
            const initials = user.username.charAt(0).toUpperCase();
            avatarElement.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-coral-500 flex items-center justify-center text-white">
                    ${initials}
                </div>
            `;
        };
        img.src = fullAvatarUrl;
    } else {
        console.log('No avatar URL, showing initials');
        // Если аватара нет, показываем инициалы
        const initials = user.username.charAt(0).toUpperCase();
        avatarElement.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-coral-500 flex items-center justify-center text-white">
                ${initials}
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем загрузку переводов
    if (!window.translations) {
        console.error('Translations not loaded!');
        return;
    }

    // Initialize i18n
    i18n.init();

    // Initialize user info
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        // Update username
        const usernameElement = document.getElementById('username-display');
        if (usernameElement) {
            usernameElement.textContent = user.username;
        }

        // Update avatar
        const avatarElement = document.getElementById('user-avatar');
        if (avatarElement) {
            avatarElement.innerHTML = user.avatar ? 
                `<img src="${user.avatar}" class="w-8 h-8 rounded-full object-cover" alt="${user.username}">` :
                `<div class="w-8 h-8 rounded-full bg-coral-500 flex items-center justify-center text-white">
                    ${user.username.charAt(0).toUpperCase()}
                </div>`;
        }
    }

    // Initialize menu
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
        const menuButton = document.getElementById('user-menu-button');
        if (menuButton) {
            menuButton.addEventListener('click', function() {
                userMenu.classList.toggle('hidden');
            });
        }

        // Setup logout
        const logoutLink = userMenu.querySelector('[data-menu="logout"]');
        if (logoutLink) {
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
            });
        }
    }

    // Initialize theme and language
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('lang', localStorage.getItem('language') || 'en');

    // Load projects only after initialization
    if (typeof loadProjects === 'function') {
        try {
            await loadProjects();
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }
});

// Делаем функцию доступной глобально
window.updateUserAvatar = updateUserAvatar;

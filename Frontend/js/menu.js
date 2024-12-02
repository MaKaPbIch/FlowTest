document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing menu handlers...');
    
    // Обработка клика по кнопке меню пользователя
    const userMenuButton = document.getElementById('userMenuButton');
    const userMenu = document.getElementById('userMenu');
    
    if (userMenuButton && userMenu) {
        console.log('Setting up user menu button handler...');
        
        // Обработчик клика по кнопке меню
        userMenuButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Предотвращаем всплытие события
            console.log('User menu button clicked');
            userMenu.classList.toggle('hidden');
        });

        // Закрытие меню при клике вне его
        document.addEventListener('click', (event) => {
            if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
                userMenu.classList.add('hidden');
            }
        });
    } else {
        console.error('User menu elements not found:', { userMenuButton, userMenu });
    }

    // Обработка клика по пунктам меню
    const profileLink = document.getElementById('profileLink');
    const settingsLink = document.getElementById('settingsLink');
    const logoutLink = document.getElementById('logoutLink');

    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Navigating to profile settings...');
            window.location.href = 'http://127.0.0.1:8080/profilesettings.html';
        });
    }

    if (settingsLink) {
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Navigating to settings page...');
            window.location.href = 'http://127.0.0.1:8080/settingspage.html';
        });
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Processing logout...');
            try {
                // Очищаем токены
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                console.log('Tokens cleared, redirecting to login...');
                // Перенаправляем на страницу входа
                window.location.href = 'http://127.0.0.1:8080/login.html';
            } catch (error) {
                console.error('Error during logout:', error);
            }
        });
    } else {
        console.error('Some menu items not found:', { profileLink, settingsLink, logoutLink });
    }

    // Обработка уведомлений
    const notificationButton = document.getElementById('notificationButton');
    const notificationRoot = document.getElementById('notification-root');

    if (notificationButton && notificationRoot) {
        notificationButton.addEventListener('click', (event) => {
            event.stopPropagation();
            notificationRoot.classList.toggle('hidden');
        });

        // Закрытие окна уведомлений при клике вне его
        document.addEventListener('click', (event) => {
            if (!notificationRoot.contains(event.target) && event.target !== notificationButton) {
                notificationRoot.classList.add('hidden');
            }
        });
    }
});

console.log('Initializing menu handlers...');

// Initialize menu
const userMenu = document.getElementById('user-menu');
if (userMenu) {
    console.log('Setting up user menu button handler...');
    const menuButton = document.getElementById('user-menu-button');
    if (menuButton) {
        menuButton.addEventListener('click', function() {
            userMenu.classList.toggle('hidden');
        });
    }

    // Setup menu items
    const menuItems = {
        profile: document.querySelector('[data-menu="profile"]'),
        settings: document.querySelector('[data-menu="settings"]'),
        logout: document.querySelector('[data-menu="logout"]')
    };

    // Setup logout handler
    if (menuItems.logout) {
        menuItems.logout.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            window.location.href = '/login.html';
        });
    }

    // Setup links
    if (menuItems.profile) menuItems.profile.href = '/profile.html';
    if (menuItems.settings) menuItems.settings.href = '/settingspage.html';
}

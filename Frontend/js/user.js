// User data management functions
async function loadUserData() {
    console.log('Loading user data...');
    try {
        const response = await fetch('http://127.0.0.1:8000/api/users/get_current_user/', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            }
        });

        console.log('User data response status:', response.status);
        if (!response.ok) {
            throw new Error(`Failed to fetch user data: ${response.status}`);
        }

        const userData = await response.json();
        console.log('User data received:', userData);
        
        // Update user name and avatar
        const userNameElement = document.getElementById('userName');
        const userAvatarContainer = document.getElementById('user-avatar');
        
        if (userNameElement) {
            userNameElement.textContent = userData.username;
        }
        
        if (userAvatarContainer) {
            if (userData.avatar) {
                userAvatarContainer.innerHTML = `<img src="${userData.avatar}" alt="${userData.username}" class="w-8 h-8 rounded-full">`;
            } else {
                const initials = userData.username
                    .split(' ')
                    .map(name => name[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                userAvatarContainer.innerHTML = `<span class="text-sm font-medium text-gray-600">${initials}</span>`;
            }
        }

        return userData;
    } catch (error) {
        console.error('Error loading user data:', error);
        // Show placeholder if error occurs
        const userAvatarContainer = document.getElementById('user-avatar');
        if (userAvatarContainer) {
            userAvatarContainer.innerHTML = `<span class="text-sm font-medium text-gray-600">?</span>`;
        }
        return null;
    }
}

// Initialize user menu toggle
function initializeUserMenu() {
    const menuButton = document.getElementById('userMenuButton');
    const menu = document.getElementById('userMenu');
    
    if (!menuButton || !menu) return;
    
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !menuButton.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });
}

// Handle logout
async function logout() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    window.location.href = 'login.html';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    initializeUserMenu();
});
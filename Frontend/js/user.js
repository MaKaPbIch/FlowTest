// User data management functions
async function loadUserData() {
    console.log('Loading user data...');
    try {
        const response = await fetchWithAuth(`/users/get_current_user/`);
        console.log('User data response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user data: ${response.status}`);
        }
        
        const userData = await response.json();
        console.log('User data received:', userData);
        
        // Store user data in localStorage for use in other components
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        // Get elements
        const userNameElement = document.getElementById('userName');
        const userAvatarContainer = document.getElementById('user-avatar');
        const adminPanelLink = document.getElementById('adminPanelLink');
        
        // Update user name if element exists
        if (userNameElement) {
            userNameElement.textContent = userData.username || '';
            console.log('Updated username element with:', userData.username);
        } else {
            console.warn('Username element not found');
        }
        
        // Update avatar if element exists
        if (userAvatarContainer) {
            console.log('Full user data for avatar check:', userData);
            
            // Check both possible avatar fields
            const avatarUrl = userData.avatar_url || userData.avatar;
            console.log('Detected avatar URL:', avatarUrl);
            
            if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined') {
                // Create full URL for avatar
                const fullAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `${config.API_BASE_URL}${avatarUrl}`;
                console.log('Full avatar URL:', fullAvatarUrl);
                
                // Set avatar image
                userAvatarContainer.innerHTML = `<img src="${fullAvatarUrl}" alt="${userData.username}" class="w-8 h-8 rounded-full object-cover">`;
            } else {
                // Show initials if no avatar
                const initials = userData.username
                    ? userData.username
                        .split(' ')
                        .map(name => name[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : '?';
                userAvatarContainer.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-coral-500 flex items-center justify-center text-white">
                        ${initials}
                    </div>
                `;
            }
        } else {
            console.warn('Avatar container element not found');
        }
        
        // Show admin panel link if user has admin role
        if (adminPanelLink) {
            // Check if user has admin role
            const hasAdminAccess = await checkAdminAccess(userData);
            if (hasAdminAccess) {
                adminPanelLink.classList.remove('hidden');
            } else {
                adminPanelLink.classList.add('hidden');
            }
        }

        return userData;
    } catch (error) {
        console.error('Error loading user data:', error);
        // Show placeholder if error occurs
        const userAvatarContainer = document.getElementById('user-avatar');
        if (userAvatarContainer) {
            userAvatarContainer.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                    <span class="text-sm font-medium">?</span>
                </div>
            `;
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
    localStorage.removeItem('currentUser'); // Remove user data from localStorage on logout
    window.location.href = 'login.html';
}

// Check if user has admin access
async function checkAdminAccess(userData) {
    // Проверяем все логи, чтобы понять проблему
    console.log('Checking admin access for user:', userData);
    
    // DEBUG: Granting admin access for debugging purposes!
    console.log('DEBUG: Granting admin access for debugging purposes!');
    return true;
    
    // Если пользователь - superuser или его имя 'admin', сразу даем доступ
    if (userData.is_superuser || userData.username === 'admin') {
        console.log('User has admin access via superuser status or admin username');
        return true;
    }
    
    try {
        // Проверяем роль, если она есть
        if (userData.role) {
            console.log('Checking user role:', userData.role);
            const roleResponse = await fetchWithAuth(`/roles/${userData.role}/`);
            console.log('Role response status:', roleResponse.status);
            
            if (roleResponse.ok) {
                const roleData = await roleResponse.json();
                console.log('Role data:', roleData);
                return roleData.is_admin_role === true;
            } else {
                console.log('Failed to fetch role data, response status:', roleResponse.status);
                // Если API ролей недоступно, но пользователь - admin, даем доступ
                return userData.username === 'admin';
            }
        }
        
        // Проверяем username, если это admin, даем доступ
        if (userData.username === 'admin') {
            console.log('User has admin access via username');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking admin access:', error);
        // В случае ошибки, но если имя пользователя admin, все равно даем доступ
        return userData.username === 'admin';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    initializeUserMenu();
});

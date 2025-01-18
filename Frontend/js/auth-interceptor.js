// Check if we're on the login page
function isLoginPage() {
    return window.location.pathname.includes('login.html');
}

// Save user preferences before login
function savePreLoginPreferences() {
    const isDark = document.documentElement.classList.contains('dark');
    const lang = document.documentElement.getAttribute('lang') || 'en';
    localStorage.setItem('preLoginTheme', isDark ? 'dark' : 'light');
    localStorage.setItem('preLoginLanguage', lang);
}

// Apply pre-login preferences after successful login
function applyPreLoginPreferences() {
    const theme = localStorage.getItem('preLoginTheme');
    const lang = localStorage.getItem('preLoginLanguage');
    if (theme) {
        localStorage.setItem('theme', theme);
    }
    if (lang) {
        localStorage.setItem('language', lang);
    }
}

// Check if token is expired
function isTokenExpired(token) {
    if (!token) return true;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        return Date.now() >= expirationTime;
    } catch (e) {
        console.error('Error checking token expiration:', e);
        return true;
    }
}

async function refreshToken() {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) {
        window.location.href = '/login.html';
        return null;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ refresh }),
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        localStorage.setItem('access', data.access);
        return data.access;
    } catch (error) {
        console.error('Error refreshing token:', error);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = '/login.html';
        return null;
    }
}

// Fetch with automatic token refresh
async function fetchWithAuth(url, options = {}) {
    if (isLoginPage()) {
        return fetch(url, options);
    }

    let token = localStorage.getItem('access');
    
    // Check if token exists and is not expired
    if (!token || isTokenExpired(token)) {
        console.log('Token missing or expired, attempting refresh');
        token = await refreshToken();
        if (!token) {
            savePreLoginPreferences();
            window.location.href = '/login.html';
            return;
        }
    }

    // Add authorization header
    const authOptions = {
        ...options,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(options.headers || {}),
            'Authorization': `Bearer ${token}`
        }
    };

    // Если тело запроса - FormData, удаляем Content-Type
    if (options.body instanceof FormData) {
        delete authOptions.headers['Content-Type'];
    }

    try {
        let response = await fetch(url, authOptions);
        
        // If we get a 401, try to refresh the token
        if (response.status === 401) {
            console.log('Got 401, attempting token refresh');
            token = await refreshToken();
            if (token) {
                // Retry the request with the new token
                authOptions.headers['Authorization'] = `Bearer ${token}`;
                response = await fetch(url, authOptions);
            } else {
                savePreLoginPreferences();
                window.location.href = '/login.html';
                return;
            }
        }
        
        return response;
    } catch (error) {
        console.error('Network error:', error);
        throw error;
    }
}

// Make function globally available
window.fetchWithAuth = fetchWithAuth;

// Function to view logs
window.showAuthLogs = function() {
    const logs = JSON.parse(sessionStorage.getItem('auth_logs') || '[]');
    console.table(logs);
    return logs;
};

// Clear logs
window.clearAuthLogs = function() {
    sessionStorage.removeItem('auth_logs');
    console.log('Auth logs cleared');
};

// Функция для логирования
function logAuth(message, type = 'info') {
    const logs = JSON.parse(sessionStorage.getItem('auth_logs') || '[]');
    logs.push({
        timestamp: new Date().toISOString(),
        type: type,
        message: message
    });
    sessionStorage.setItem('auth_logs', JSON.stringify(logs));
    console.log(`[${type}] ${message}`);
}

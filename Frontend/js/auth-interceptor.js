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

// Refresh the access token
async function refreshAccessToken() {
    if (isLoginPage()) {
        return null;
    }

    try {
        console.log('Attempting to refresh access token...');
        const refresh = localStorage.getItem('refresh');
        if (!refresh) {
            console.warn('No refresh token available');
            throw new Error('No refresh token available');
        }

        const response = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh: refresh
            })
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        console.log('Token refreshed successfully');
        localStorage.setItem('access', data.access);
        return data.access;
    } catch (error) {
        console.error('Error refreshing token:', error);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        if (!isLoginPage()) {
            window.location.href = '/login.html';
        }
        return null;
    }
}

// Get valid access token
async function getValidAccessToken() {
    if (isLoginPage()) {
        console.log('On login page, skipping token validation');
        return null;
    }

    const access = localStorage.getItem('access');
    console.log('Current access token:', access);
    
    if (!access || isTokenExpired(access)) {
        console.warn('Access token missing or expired');
        return await refreshAccessToken();
    }
    
    console.log('Access token is valid');
    return access;
}

// Fetch with automatic token refresh
async function fetchWithAuth(url, options = {}) {
    if (isLoginPage()) {
        return fetch(url, options);
    }

    const token = await getValidAccessToken();
    if (!token) {
        throw new Error('No valid token available');
    }

    const authOptions = {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }
    };

    try {
        const response = await fetch(url, authOptions);
        
        if (response.status === 401) {
            const newToken = await refreshAccessToken();
            if (!newToken) {
                throw new Error('Failed to refresh token');
            }
            
            authOptions.headers['Authorization'] = `Bearer ${newToken}`;
            return await fetch(url, authOptions);
        }
        
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

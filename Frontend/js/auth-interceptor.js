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

// Function to restore preferences after login
function restorePreLoginPreferences() {
    const theme = localStorage.getItem('preLoginTheme');
    const lang = localStorage.getItem('preLoginLanguage');
    
    if (theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
    
    if (lang) {
        document.documentElement.setAttribute('lang', lang);
        // If i18n is loaded, update the language
        if (typeof setLanguage === 'function') {
            setLanguage(lang);
        }
    }
}

// Fetch with authentication
async function fetchWithAuth(url, options = {}) {
    // FORCE the base URL to ensure consistency
    const API_BASE = 'http://127.0.0.1:8000';
    
    // Ensure paths are correctly formed - standardizing URL handling
    let fullUrl;
    if (url.startsWith('http')) {
        fullUrl = url;
    } else {
        // URL construction
        let path = url;
        
        // Remove any duplicate /api prefixes
        // First, remove leading slash for consistent processing
        if (path.startsWith('/')) {
            path = path.slice(1);
        }
        
        // Don't add api/ if it's already there
        if (!path.startsWith('api/')) {
            path = `api/${path}`;
        }
        
        // Make sure we don't double up on slashes
        fullUrl = `${API_BASE}/${path}`;
    }
    
    console.log('Normalized request URL:', fullUrl);
    
    const token = localStorage.getItem('access');
    
    if (!token && !isLoginPage()) {
        // Redirect to login if no token found (except on login page)
        window.location.href = '/login.html';
        throw new Error('No authentication token found');
    }
    
    // Set up headers with authentication token
    const headers = options.headers || {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Merge options
    const fetchOptions = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };
    
    try {
        // First attempt with normalized URL
        console.log('Trying request with URL:', fullUrl);
        let response = await fetch(fullUrl, fetchOptions);
        
        // If we get a 404, try a direct call with absolute URL as fallback
        if (response.status === 404 && !fullUrl.startsWith('http')) {
            // Be smart about fallbacks - try various patterns if we get a 404
            const API_BASE = 'http://127.0.0.1:8000';
            let fallbackPath = url;
            
            // Try without api/ prefix if it was already there
            if (url.startsWith('api/') || url.startsWith('/api/')) {
                fallbackPath = url.replace(/^(\/?api\/)/, '');
            }
            
            const backupUrl = `${API_BASE}/api/${fallbackPath.replace(/^\//, '')}`;
            console.log('Got 404, trying alternative URL format:', backupUrl);
            response = await fetch(backupUrl, fetchOptions);
        }
        
        // Handle 401 (unauthorized)
        if (response.status === 401 && !isLoginPage()) {
            console.log('Unauthorized, trying to refresh token...');
            
            // Try to refresh the token
            const refreshed = await refreshToken();
            
            if (refreshed) {
                console.log('Token refreshed, retrying request...');
                // Get the new token
                const newToken = localStorage.getItem('access');
                // Update Authorization header
                fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
                // Retry the fetch
                return fetch(fullUrl, fetchOptions);
            } else {
                // If refresh failed, redirect to login
                savePreLoginPreferences();
                window.location.href = '/login.html';
                throw new Error('Session expired, please login again');
            }
        }
        
        return response;
    } catch (error) {
        console.error('Error in fetchWithAuth:', error);
        throw error;
    }
}

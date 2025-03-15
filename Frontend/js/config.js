// Конфигурация приложения
const config = {
    // API endpoints
    API_BASE_URL: 'http://127.0.0.1:8000',
    // Removed API_PREFIX as we now handle it in fetchWithAuth directly
    
    // Authentication
    TOKEN_REFRESH_INTERVAL: 4 * 60 * 1000, // 4 minutes
    
    // Theme
    DEFAULT_THEME: 'light',
    
    // Projects
    DEFAULT_PROJECT_ID: 1,
    
    // Endpoints
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/token/',
            REFRESH: '/api/token/refresh/',
            VERIFY: '/api/token/verify/',
            CURRENT_USER: '/api/users/get_current_user/'
        },
        USERS: {
            PROFILE: '/api/users/profile/',
            LANGUAGE: '/api/users/language/',
            THEME: '/api/users/theme/',
            AVATAR: '/api/users/profile/avatar/'
        },
        PROJECTS: '/api/projects/',
        FOLDERS: '/api/folders/',
        TEST_CASES: '/api/testcases/',
        REPORTS: {
            TEMPLATES: '/api/report-templates/',
            ANALYTICS: '/api/backend/report-templates/analytics/',
            METRICS: '/api/backend/report-templates/analytics/metrics/',
            CHARTS: '/api/backend/report-templates/analytics/charts/'
        }
    }
};

// Make config available both as a module export and global variable
if (typeof exports !== 'undefined') {
    exports.config = config;
} else {
    window.config = config;
}

// Initialize theme on all pages
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize theme using ThemeManager if available
        if (window.ThemeManager) {
            window.ThemeManager.init();
        }
    } catch (error) {
        console.error('Error initializing theme:', error);
    }
});

// Function to make fetchData globally available
window.fetchData = async function(projectId) {
    console.log('Fetch data called for project:', projectId);
    
    // Базовая реализация fetchData, которая может быть переопределена на других страницах
    return {
        status: 'ok',
        message: 'Basic fetchData implementation'
    };
};

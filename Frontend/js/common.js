// Initialize theme on all pages
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize theme
        await initializeTheme();
    } catch (error) {
        console.error('Error initializing theme:', error);
    }
});

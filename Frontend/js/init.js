// Initialize theme and language for all pages
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize theme first
        console.log('Initializing theme...');
        await initializeTheme();
        
        // Then initialize language
        console.log('Initializing language...');
        const currentLang = await getCurrentLanguage();
        await loadTranslations(currentLang);
        await translatePage();
        
        // Add event listener for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
            const theme = await getThemeFromServer();
            if (!theme) { // Only update if user hasn't set a preference
                if (e.matches) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        });

        console.log('Initialization complete!');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

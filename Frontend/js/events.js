document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Инициализация переводов
        await i18n.init();
        
        // Инициализация календаря и других компонентов
        initializeCalendar();
        initializeEventHandlers();
    } catch (error) {
        console.error('Error initializing events page:', error);
    }
}); 
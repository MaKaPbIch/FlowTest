const i18n = {
    currentLanguage: 'ru',

    async init() {
        console.log('Initializing i18n with language:', this.currentLanguage);
        
        // Проверяем, загружены ли переводы
        if (typeof window.translations === 'undefined') {
            throw new Error('Translations not loaded. Make sure translations.js is included before i18n.js');
        }

        await this.loadTranslations();
        this.translatePage();
    },

    loadTranslations() {
        return new Promise((resolve, reject) => {
            try {
                this.translations = window.translations[this.currentLanguage];
                if (!this.translations) {
                    throw new Error(`Translations for language ${this.currentLanguage} not found`);
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },

    t(key) {
        return this.translations[key] || key;
    },

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });
    }
};

window.i18n = i18n;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    i18n.init().catch(error => {
        console.error('Failed to initialize i18n:', error);
    });
});

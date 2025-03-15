const i18n = {
    currentLanguage: localStorage.getItem('language') || navigator.language.split('-')[0] || 'en',
    initialized: false,

    async init() {
        console.log('Initializing i18n with language:', this.currentLanguage);
        
        // Проверяем, загружены ли переводы
        if (typeof window.translations === 'undefined') {
            console.error('Translations not loaded. Waiting for translations to be available.');
            return false;
        }

        try {
            await this.loadTranslations();
            this.translatePage();
            this.initialized = true;
            
            // Отправляем событие о завершении инициализации
            const event = new CustomEvent('i18n:initialized');
            document.dispatchEvent(event);
            
            console.log('Translation complete:', this.translations);
            return true;
        } catch (error) {
            console.error('Error during i18n initialization:', error);
            return false;
        }
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

    isInitialized() {
        return this.initialized;
    },

    t(key) {
        if (!this.translations) {
            console.warn(`Translations not loaded yet for key: ${key}`);
            return key;
        }
        
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

// Инициализация после загрузки переводов
// Если переводы уже загружены, инициализируем сразу
// Иначе ждем события translations:loaded
(function() {
    console.log('i18n script loaded, checking translations status');
    if (window.translationsLoaded) {
        console.log('Translations already loaded, initializing i18n');
        i18n.init().catch(error => {
            console.error('Failed to initialize i18n on script load:', error);
        });
    } else {
        console.log('Waiting for translations to be loaded...');
        document.addEventListener('translations:loaded', () => {
            console.log('Translations loaded event received, initializing i18n');
            i18n.init().catch(error => {
                console.error('Failed to initialize i18n after translations loaded:', error);
            });
        });
    }
})();

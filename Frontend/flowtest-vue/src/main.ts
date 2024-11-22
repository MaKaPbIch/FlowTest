import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createI18n } from 'vue-i18n';
import { createVuetify } from 'vuetify';
import 'vuetify/styles'; // Импорт стилей Vuetify
import * as components from 'vuetify/components'; // Импорт всех компонентов Vuetify
import * as directives from 'vuetify/directives'; // Импорт всех директив Vuetify
import { aliases, mdi } from 'vuetify/iconsets/mdi'; // Импорт иконок Material Design

import en from './locales/en.json';
import ru from './locales/ru.json';
import de from './locales/de.json';

// Создание экземпляра Vuetify
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#4CAF50', // Зеленый основной
          secondary: '#A5D6A7', // Светлый зеленый
          background: '#F8F9FA', // Белый фон с небольшим оттенком
          surface: '#FFFFFF', // Белая поверхность
          accent: '#C8E6C9', // Дополнительный цвет
        },
      },
    },
  },
});

// Настройка интернационализации
const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'en',
  messages: { en, ru, de },
});

const app = createApp(App);

app.use(router);
app.use(i18n);
app.use(vuetify);

app.mount('#app');

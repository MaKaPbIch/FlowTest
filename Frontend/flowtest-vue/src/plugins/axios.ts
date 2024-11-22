import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://127.0.0.1:8000', // Укажите ваш серверный адрес
});

// Перехватчик для добавления токена к каждому запросу
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Перехватчик для обработки ошибок 401 и обновления токена
instance.interceptors.response.use(
  response => response,
  async error => {
    if (error.response && error.response.status === 401) {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await instance.post('/api/token/refresh/', {
            refresh: refreshToken,
          });
          localStorage.setItem('authToken', response.data.access);
          error.config.headers['Authorization'] = `Bearer ${response.data.access}`;
          return instance(error.config); // Повторный запрос с новым токеном
        }
      } catch (refreshError) {
        console.error('Ошибка обновления токена:', refreshError);
        // Здесь можно, например, выйти из системы
      }
    }
    return Promise.reject(error);
  }
);

export default instance;

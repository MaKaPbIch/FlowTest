// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    
    // Проверяем, есть ли активная сессия
    const access = localStorage.getItem('access');
    const refresh = localStorage.getItem('refresh');
    if (access && refresh) {
        window.location.href = '/';
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember_me').checked;

        try {
            const response = await fetch('http://127.0.0.1:8000/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password
                }),
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            
            localStorage.setItem('access', data.access);
            localStorage.setItem('refresh', data.refresh);
            
            if (!rememberMe) {
                // Если "Remember me" не выбран, установим время жизни токенов
                sessionStorage.setItem('session_expires', Date.now() + (24 * 60 * 60 * 1000)); // 24 часа
            }

            window.location.href = '/';
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please check your credentials.');
        }
    });
});

// Initialize language selector
document.addEventListener('DOMContentLoaded', function() {
    const languageSelect = document.getElementById('languageSelect');
    const savedLanguage = localStorage.getItem('preLoginLanguage') || localStorage.getItem('language') || 'en';
    languageSelect.value = savedLanguage;
});

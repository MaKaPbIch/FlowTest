document.addEventListener('DOMContentLoaded', function() {
    try {
        // Проверяем, есть ли действующий токен
        const token = localStorage.getItem('access');
        if (token) {
            window.location.href = '/index.html';
            return;
        }

        // Initialize i18n
        i18n.init();
        
        // Initialize language select
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            const currentLang = localStorage.getItem('language') || 'en';
            languageSelect.value = currentLang;
            updateFlag(currentLang);
            
            languageSelect.addEventListener('change', function(e) {
                const lang = e.target.value;
                localStorage.setItem('language', lang);
                updateFlag(lang);
                i18n.init();
            });
        }

        // Handle login form
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                try {
                    const data = await login(username, password);
                    if (data && data.access) {
                        window.location.href = '/index.html';
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    // Показываем ошибку пользователю
                    const errorElement = document.getElementById('loginError');
                    if (errorElement) {
                        errorElement.textContent = error.message;
                        errorElement.classList.remove('hidden');
                    }
                }
            });
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Function to update the flag icon
function updateFlag(lang) {
    const flagElement = document.querySelector('.language-flag');
    if (flagElement) {
        // Remove all existing classes
        flagElement.className = 'language-flag fi';
        
        // Add the appropriate flag class
        switch (lang) {
            case 'en':
                flagElement.classList.add('fi-gb');
                break;
            case 'ru':
                flagElement.classList.add('fi-ru');
                break;
            case 'de':
                flagElement.classList.add('fi-de');
                break;
        }
    }
}

async function login(username, password) {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Login failed');
        }

        const data = await response.json();
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Функция для обновления профиля
async function updateProfile(formData) {
    try {
        // Получаем ID текущего пользователя из localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.id) {
            throw new Error('User ID not found');
        }

        // Отправляем запрос на правильный endpoint с методом POST
        const response = await fetchWithAuth(`http://127.0.0.1:8000/api/users/update_user_info/`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile');
        }

        const updatedUser = await response.json();
        
        // Обновляем данные пользователя в localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Показываем уведомление об успехе
        showNotification('Profile updated successfully', 'success');
        
        return updatedUser;
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(error.message || 'Error updating profile', 'error');
        throw error;
    }
}

// Функция для загрузки данных пользователя
async function loadUserData() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;

        // Заполняем поля формы
        document.getElementById('username').value = user.username || '';
        document.getElementById('firstName').value = user.first_name || '';
        document.getElementById('lastName').value = user.last_name || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('about').value = user.about || '';

        // Если есть аватар, отображаем его
        if (user.avatar) {
            document.getElementById('avatar').src = user.avatar;
        }

        // Сохраняем оригинальные данные
        originalData = {
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            about: user.about
        };
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Error loading user data', 'error');
    }
}

// Обработчик отправки формы
document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData();
    let hasChanges = false;

    // Проверяем изменения в текстовых полях
    const fields = ['username', 'firstName', 'lastName', 'email', 'about'];
    fields.forEach(field => {
        const value = document.getElementById(field).value;
        if (value !== originalData[field]) {
            formData.append(field, value);
            hasChanges = true;
        }
    });

    // Проверяем, был ли загружен новый аватар
    const avatarInput = document.getElementById('avatar-upload');
    if (avatarInput.files.length > 0) {
        formData.append('avatar', avatarInput.files[0]);
        hasChanges = true;
    }

    if (!hasChanges) {
        showNotification('No changes to save', 'info');
        return;
    }

    try {
        await updateProfile(formData);
        showNotification('Profile updated successfully', 'success');
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Error saving profile', 'error');
    }
});

// Обработчик загрузки аватара
document.getElementById('avatar-upload').addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('avatar').src = e.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

// Загружаем данные при загрузке страницы
document.addEventListener('DOMContentLoaded', loadUserData);
// Основная функция для инициализации страницы событий
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Инициализация переводов
        await window.i18n.init();
        
        // Инициализация компонентов UI
        setupUserInterface();
        
        // Инициализация календаря
        initializeCalendar();
        
        // Загрузка событий
        loadEvents();
        
        // Добавление обработчиков событий
        setupEventHandlers();
    } catch (error) {
        console.error('Error initializing events page:', error);
        if (typeof showNotification === 'function') {
            showNotification('error', 'Failed to initialize events page');
        } else {
            alert('Failed to initialize events page');
        }
    }
});

// Настройка пользовательского интерфейса
function setupUserInterface() {
    try {
        // Инициализация тёмной/светлой темы (если функция существует)
        if (typeof applyTheme === 'function') {
            applyTheme();
        } else {
            console.log('applyTheme function not found, skipping theme initialization');
        }
        
        // Инициализация компонентов пользовательского интерфейса (если функция существует)
        if (typeof initUserProfile === 'function') {
            initUserProfile();
        } else {
            console.log('initUserProfile function not found, skipping profile initialization');
        }
        
        // Обновление дат в соответствии с языком
        localizeDates();
    } catch (error) {
        console.error('Error in setupUserInterface:', error);
    }
}

// Локализация дат
function localizeDates() {
    try {
        // Здесь можно добавить логику локализации дат в зависимости от языка
        console.log('Localizing dates based on language:', window.i18n.currentLanguage);
    } catch (error) {
        console.error('Error in localizeDates:', error);
    }
}

// Инициализация календаря
function initializeCalendar() {
    // Убедимся, что глобальный объект Calendar существует
    if (!window.Calendar) {
        console.error('Calendar object not found');
        return;
    }
    
    // Инициализация календаря
    window.Calendar.init();
    
    // Добавление функциональности выбора даты
    addDateSelectionHandlers();
    
    // Инициализация полей формы
    setupDateField();
}

// Инициализация поля выбора даты
function setupDateField() {
    const dateInput = document.getElementById('eventDate');
    if (dateInput) {
        // Установка текущей даты по умолчанию
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        dateInput.value = formattedDate;
        
        // Выбор даты через календарь input type="date"
        dateInput.addEventListener('change', function(e) {
            const dateParts = this.value.split('-');
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // месяцы в JS начинаются с 0
            const day = parseInt(dateParts[2]);
            
            // Создаем новый объект даты
            const selectedDate = new Date(year, month, day);
            
            // Отображаем выбранную дату
            updateSelectedDateDisplay(selectedDate);
            
            // Если нужно обновить месяц в календаре
            if (month !== window.Calendar.currentMonth || year !== window.Calendar.currentYear) {
                window.Calendar.currentMonth = month;
                window.Calendar.currentYear = year;
                window.Calendar.updateCalendarHeader();
                window.Calendar.renderCalendar(selectedDate);
            }
        });
        
        // Сразу показываем текущую дату и в визуальном элементе
        const selectedDateElement = document.getElementById('selectedDate');
        if (selectedDateElement) {
            selectedDateElement.textContent = today.toLocaleDateString();
        }
        
        // Обновляем скрытое поле
        const dateHidden = document.getElementById('eventDateHidden');
        if (dateHidden) {
            dateHidden.value = formattedDate;
        }
    }
}

// Обработка выбора даты
function addDateSelectionHandlers() {
    try {
        // Делегирование события клика на дни календаря
        document.querySelector('.calendar-days').addEventListener('click', (event) => {
            // Проверяем, что клик был по элементу дня
            if (event.target.classList.contains('calendar-day')) {
                // Выбираем все даты и убираем класс выбранного
                document.querySelectorAll('.calendar-day').forEach(day => {
                    day.classList.remove('selected');
                });
                
                // Добавляем класс выбранного текущему дню
                event.target.classList.add('selected');
                
                // Получаем дату из атрибута или вычисляем
                const dateText = event.target.getAttribute('data-date') || event.target.textContent;
                const date = calculateSelectedDate(dateText);
                
                // Отображаем выбранную дату и обновляем форму
                updateSelectedDateDisplay(date);
            }
        });
    } catch (error) {
        console.error('Error in addDateSelectionHandlers:', error);
    }
}

// Вычисление выбранной даты на основе текста и текущего месяца/года
function calculateSelectedDate(dayText) {
    const day = parseInt(dayText);
    const currentMonth = window.Calendar.currentMonth;
    const currentYear = window.Calendar.currentYear;
    return new Date(currentYear, currentMonth, day);
}

// Обновление отображения выбранной даты
function updateSelectedDateDisplay(date) {
    // Обновляем отображение даты в тексте
    const selectedDateElement = document.getElementById('selectedDate');
    if (selectedDateElement) {
        selectedDateElement.textContent = date.toLocaleDateString();
    }
    
    // Обновляем поле ввода даты
    const dateInput = document.getElementById('eventDate');
    if (dateInput) {
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        dateInput.value = formattedDate;
    }
    
    // Обновляем скрытое поле формы
    const dateHidden = document.getElementById('eventDateHidden');
    if (dateHidden) {
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        dateHidden.value = formattedDate;
    }
    
    // Выделяем выбранный день в календаре
    document.querySelectorAll('.calendar-day').forEach(day => {
        if (day.classList.contains('selected')) {
            day.classList.remove('selected');
        }
        
        // Если день совпадает с выбранной датой, выделяем его
        if (day.textContent.trim() === date.getDate().toString() && 
            !day.classList.contains('other-month') && 
            window.Calendar.currentMonth === date.getMonth() && 
            window.Calendar.currentYear === date.getFullYear()) {
            day.classList.add('selected');
        }
    });
}

// Загрузка событий с сервера
async function loadEvents() {
    try {
        // Для демонстрации можно использовать тестовые данные
        const demoEvents = getDemoEvents();
        processEvents(demoEvents);
        
        // Раскомментировать для реальной загрузки с API
        // const response = await fetch(`${config.apiUrl}/api/events/`);
        // if (!response.ok) {
        //     throw new Error(`HTTP error! status: ${response.status}`);
        // }
        // const events = await response.json();
        // processEvents(events);
    } catch (error) {
        console.error('Error loading events:', error);
        // Можно показать уведомление об ошибке
    }
}

// Демо-события для тестирования
function getDemoEvents() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return [
        {
            id: 1,
            title: "Тестовый запуск UI тестов",
            date: formatDate(today),
            time: "10:00",
            description: "Запуск всех UI тестов в проекте",
            category: "test_run",
            color: "#4CAF50"
        },
        {
            id: 2,
            title: "Встреча команды",
            date: formatDate(today),
            time: "14:30",
            description: "Еженедельная встреча команды",
            category: "reminder",
            color: "#FF7F50"
        },
        {
            id: 3,
            title: "Дедлайн по релизу",
            date: formatDate(tomorrow),
            time: "18:00",
            description: "Завершение работ по релизу v1.2.0",
            category: "reminder",
            color: "#FF7F50"
        },
        {
            id: 4,
            title: "Регрессионное тестирование",
            date: formatDate(nextWeek),
            time: "09:00",
            description: "Полное регрессионное тестирование перед релизом",
            category: "test_run",
            color: "#4CAF50"
        }
    ];
}

// Форматирование даты для API
function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Обработка и отображение событий
function processEvents(events) {
    // Преобразуем события в формат, понятный для календаря
    const calendarEvents = {};
    
    events.forEach(event => {
        const dateString = event.date; // Формат: YYYY-MM-DD
        
        if (!calendarEvents[dateString]) {
            calendarEvents[dateString] = [];
        }
        
        calendarEvents[dateString].push({
            id: event.id,
            title: event.title,
            time: event.time,
            description: event.description,
            category: event.category,
            color: event.color || getCategoryColor(event.category)
        });
    });
    
    // Передаем события в календарь
    window.Calendar.events = calendarEvents;
    
    // Перерисовываем календарь, чтобы отобразить маркеры событий
    window.Calendar.renderCalendar(new Date(window.Calendar.currentYear, window.Calendar.currentMonth));
}

// Получение цвета по категории события
function getCategoryColor(category) {
    const colors = {
        'reminder': '#FF7F50', // Coral
        'test_run': '#4CAF50', // Green
        'meeting': '#2196F3', // Blue
        'deadline': '#F44336', // Red
        'default': '#9C27B0'  // Purple
    };
    
    return colors[category] || colors.default;
}

// Настройка обработчиков событий формы
function setupEventHandlers() {
    try {
        // Обработчик изменения категории
        const categorySelect = document.getElementById('eventCategory');
        if (categorySelect) {
            categorySelect.addEventListener('change', function() {
                const testRunFields = document.getElementById('testRunFields');
                const eventColorInput = document.getElementById('eventColor');
                
                if (testRunFields) {
                    if (this.value === 'test_run') {
                        testRunFields.classList.remove('hidden');
                        // Устанавливаем цвет для тестовых запусков
                        if (eventColorInput) eventColorInput.value = '#4CAF50';
                    } else {
                        testRunFields.classList.add('hidden');
                        // Устанавливаем цвет для обычных напоминаний
                        if (eventColorInput) eventColorInput.value = '#FF7F50';
                    }
                }
            });
        }
        
        // Обработчик сохранения события
        const eventForm = document.getElementById('eventForm');
        if (eventForm) {
            eventForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                await saveEvent();
            });
            
            // Делаем кнопку более заметной
            const submitButton = eventForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.classList.add('transform', 'transition-transform', 'duration-200');
                
                submitButton.addEventListener('mouseenter', function() {
                    this.classList.add('shadow-lg', 'scale-105');
                });
                
                submitButton.addEventListener('mouseleave', function() {
                    this.classList.remove('shadow-lg', 'scale-105');
                });
            }
        }
    } catch (error) {
        console.error('Error in setupEventHandlers:', error);
    }
}

// Сохранение события
async function saveEvent() {
    try {
        // Получение данных из формы
        const formData = {
            title: document.getElementById('eventTitle').value,
            date: document.getElementById('eventDateHidden')?.value || document.getElementById('eventDate')?.value,
            time: document.getElementById('eventTime').value,
            category: document.getElementById('eventCategory').value,
            color: document.getElementById('eventColor').value,
            description: document.getElementById('eventDescription').value
        };
        
        // Если выбрана категория тестового запуска, добавляем дополнительные поля
        if (formData.category === 'test_run') {
            formData.repeat_period = document.getElementById('repeatPeriod')?.value || 'none';
            formData.skip_weekends = document.getElementById('skipWeekends')?.checked || false;
            
            // Убедимся, что цвет соответствует типу события
            formData.color = '#4CAF50';
        } else {
            // Для обычных напоминаний всегда используем одинаковый цвет
            formData.color = '#FF7F50';
        }
        
        // Проверка обязательных полей
        if (!formData.title || !formData.date) {
            throw new Error(window.i18n.t('title') + ' ' + window.i18n.t('and') + ' ' + window.i18n.t('date') + ' ' + window.i18n.t('are_required'));
        }
        
        console.log('Creating new event:', formData);
        
        // Попытка сохранить в API
        try {
            const response = await fetch(`${config.apiUrl}/api/events/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                console.warn('API request failed, using local storage instead');
                // Если API недоступен, используем локальное хранилище
                throw new Error('API unavailable');
            }
            
            const result = await response.json();
            await loadEvents();
            
            // Сброс формы и отображение уведомления
            document.getElementById('eventForm').reset();
            
            // Показываем уведомление об успешном создании
            showNotification('success', window.i18n.t('event_created_successfully'));
            
            return true;
            
        } catch (apiError) {
            console.log('Using local storage as fallback');
            
            // Для демонстрации добавляем событие локально
            const newEvent = {
                id: Date.now(), // Временный ID
                ...formData
            };
            
            // Получаем текущие события
            const events = Object.values(window.Calendar.events || {}).flat();
            events.push(newEvent);
            
            // Обновляем отображение
            processEvents(events);
            
            // Сброс формы и отображение уведомления
            document.getElementById('eventForm').reset();
            
            // Показываем уведомление об успешном создании
            showNotification('success', window.i18n.t('event_created_successfully'));
            
            return true;
        }
    } catch (error) {
        console.error('Error saving event:', error);
        showNotification('error', window.i18n.t('failed_to_save_event') + ': ' + error.message);
        return false;
    }
}

// Функция для отображения уведомлений
function showNotification(type, message) {
    try {
        // Проверяем, доступна ли функция уведомлений
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`${type}: ${message}`);
            // Запасной вариант, если функция уведомлений недоступна
            alert(message);
        }
    } catch (error) {
        console.error('Error in showNotification:', error);
        alert(message);
    }
}
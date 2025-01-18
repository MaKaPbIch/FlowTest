let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

function updateCalendarHeader() {
    const monthDisplay = document.getElementById("monthDisplay");
    if (!monthDisplay) return;

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
}

function generateCalendarDays() {
    const calendarDays = document.getElementById('calendarDays');
    if (!calendarDays) return;

    calendarDays.innerHTML = '';
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Добавляем пустые ячейки для дней до начала месяца
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'p-2 text-center text-gray-400 dark:text-gray-600';
        calendarDays.appendChild(dayElement);
    }
    
    // Добавляем дни месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day flex items-center justify-center cursor-pointer';
        
        // Проверяем, является ли этот день сегодняшним
        const isToday = day === currentDate.getDate() && 
                       currentMonth === currentDate.getMonth() && 
                       currentYear === currentDate.getFullYear();
        
        if (isToday) {
            dayElement.classList.add('today');
        }
        
        dayElement.textContent = day;
        dayElement.onclick = () => {
            window.location.href = 'events.html';
        };
        
        calendarDays.appendChild(dayElement);
    }
    
    // Добавляем пустые ячейки в конце
    const endPadding = 42 - (startPadding + lastDay.getDate()); // 42 = 6 rows * 7 days
    for (let i = 0; i < endPadding; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'p-2 text-center text-gray-400 dark:text-gray-600';
        calendarDays.appendChild(dayElement);
    }
}

function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    updateCalendarHeader();
    generateCalendarDays();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    updateCalendarHeader();
    generateCalendarDays();
}

// Инициализация календаря при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateCalendarHeader();
    generateCalendarDays();
}); 
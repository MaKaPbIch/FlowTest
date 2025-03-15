// Объект для управления календарем
window.Calendar = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDate: null,
    events: {},

    updateCalendarHeader() {
        const monthNames = {
            ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
            en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
        };
        
        // Определяем текущий язык
        let currentLang = 'en';
        if (window.i18n && window.i18n.currentLanguage) {
            currentLang = window.i18n.currentLanguage;
        }
        
        const headerMonth = document.querySelector('.calendar-current-month');
        if (headerMonth) {
            // Используем месяцы для текущего языка или английский по умолчанию
            const months = monthNames[currentLang] || monthNames['en'];
            headerMonth.textContent = `${months[this.currentMonth]} ${this.currentYear}`;
        }
    },

    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.updateCalendarHeader();
        this.renderCalendar();
    },

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.updateCalendarHeader();
        this.renderCalendar();
    },

    renderCalendar(date = new Date()) {
        const calendar = document.querySelector('.calendar-days');
        if (!calendar) return;

        // Clear existing calendar
        calendar.innerHTML = '';

        // Get first day of month and last day of month
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        // Get the day of week for the first day (0-6)
        const firstDayIndex = firstDay.getDay();

        // Create array of days
        const days = [];
        
        // Add previous month's days
        for (let i = firstDayIndex; i > 0; i--) {
            const prevDate = new Date(firstDay);
            prevDate.setDate(prevDate.getDate() - i);
            days.push({
                date: prevDate,
                isCurrentMonth: false
            });
        }

        // Add current month's days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const currentDate = new Date(date.getFullYear(), date.getMonth(), i);
            days.push({
                date: currentDate,
                isCurrentMonth: true
            });
        }

        // Add next month's days to complete the grid
        const remainingDays = 42 - days.length; // 6 rows × 7 days = 42
        for (let i = 1; i <= remainingDays; i++) {
            const nextDate = new Date(lastDay);
            nextDate.setDate(nextDate.getDate() + i);
            days.push({
                date: nextDate,
                isCurrentMonth: false
            });
        }

        // Render days
        days.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');
            
            if (!day.isCurrentMonth) {
                dayElement.classList.add('other-month');
            }
            
            if (day.date.toDateString() === new Date().toDateString()) {
                dayElement.classList.add('today');
            }

            const dateString = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
            const hasEvents = this.events[dateString] && this.events[dateString].length > 0;

            if (hasEvents) {
                const eventDot = document.createElement('div');
                eventDot.className = 'absolute bottom-1 left-1/2 transform -translate-x-1/2';
                if (this.events[dateString].length > 1) {
                    eventDot.innerHTML = `<div class="flex gap-1">${this.events[dateString].slice(0, 3).map(event => 
                        `<div class="w-2 h-2 rounded-full" style="background-color: ${event.color}"></div>`
                    ).join('')}</div>`;
                } else {
                    eventDot.innerHTML = `<div class="w-2 h-2 rounded-full" style="background-color: ${this.events[dateString][0].color}"></div>`;
                }
                dayElement.appendChild(eventDot);
            }

            dayElement.textContent = day.date.getDate();
            dayElement.addEventListener('click', () => this.selectDate(day.date.getFullYear(), day.date.getMonth(), day.date.getDate()));
            calendar.appendChild(dayElement);
        });
    },

    selectDate(year, month, day) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        document.getElementById('selectedDateDisplay').textContent = new Date(dateString).toLocaleDateString();
        document.getElementById('eventDate').value = dateString;

        if (this.events[dateString] && this.events[dateString].length > 0) {
            this.showEventsModal(dateString);
        }
    },

    showEventsModal(dateString) {
        const modal = document.getElementById('eventsModal');
        const eventsList = document.getElementById('eventsList');
        const modalDate = document.getElementById('modalDate');
        
        modalDate.textContent = new Date(dateString).toLocaleDateString();
        eventsList.innerHTML = '';

        this.events[dateString].forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'p-4 rounded-lg border border-gray-200';
            eventElement.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded-full" style="background-color: ${event.color}"></div>
                    <h4 class="font-semibold">${event.title}</h4>
                </div>
                <p class="text-sm text-gray-600 mt-1">${event.time}</p>
                <p class="text-sm text-gray-600 mt-1">Reminder: ${event.reminder}</p>
                <p class="text-sm mt-2">${event.description}</p>
            `;
            eventsList.appendChild(eventElement);
        });

        modal.classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('eventsModal').classList.add('hidden');
    },

    init() {
        this.updateCalendarHeader();
        this.renderCalendar();
        
        // Добавляем обработчики для кнопок
        document.querySelector('.prev-month')?.addEventListener('click', () => this.previousMonth());
        document.querySelector('.next-month')?.addEventListener('click', () => this.nextMonth());
        
        // Обработчик для формы добавления события
        document.getElementById('eventForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('eventDate').value;
            const event = {
                title: document.getElementById('eventTitle').value,
                time: document.getElementById('eventTime').value,
                category: document.getElementById('eventCategory').value,
                reminder: document.getElementById('eventReminder').value,
                color: document.getElementById('eventColor').value,
                description: document.getElementById('eventDescription').value
            };

            if (!this.events[date]) {
                this.events[date] = [];
            }
            this.events[date].push(event);
            this.renderCalendar(new Date(date));
            this.showEventsModal(date);
            e.target.reset();
            document.getElementById('selectedDateDisplay').textContent = 'No date selected';
        });
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => window.Calendar.init());

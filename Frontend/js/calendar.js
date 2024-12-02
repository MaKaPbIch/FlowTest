let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

// Load calendar HTML
document.addEventListener('DOMContentLoaded', function() {
    fetch('calendarmini.html')
        .then(response => response.text())
        .then(html => {
            // Create a container for the calendar after the calendar button
            const calendarButton = document.querySelector('[aria-label="Schedule new event"]');
            const container = document.createElement('div');
            container.id = 'calendarContainer';
            calendarButton.parentNode.insertBefore(container, calendarButton.nextSibling);
            container.innerHTML = html;
            
            // Initialize calendar
            updateCalendar();
        });
});

function updateCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    document.getElementById("monthDisplay").textContent = `${monthNames[currentMonth]} ${currentYear}`;
    renderCalendar();
}

function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    updateCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    updateCalendar();
}

function openModal(date) {
    document.getElementById("selectedDate").textContent = `${date} ${monthNames[currentMonth]} ${currentYear}`;
    document.getElementById("eventModal").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("eventModal").classList.add("hidden");
}

function toggleCalendar() {
    const popup = document.getElementById('calendarPopup');
    popup.classList.toggle('hidden');
    updateCalendar();
}

function renderCalendar() {
    const daysContainer = document.getElementById('calendarDays');
    if (!daysContainer) return;
    
    daysContainer.innerHTML = '';

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startPadding = firstDay.getDay();

    // Add padding for previous month
    for (let i = 0; i < startPadding; i++) {
        const prevDate = new Date(currentYear, currentMonth, 0 - (startPadding - i - 1));
        addDayToCalendar(daysContainer, prevDate.getDate(), true);
    }

    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        addDayToCalendar(daysContainer, i, false);
    }

    // Add padding for next month
    const endPadding = 42 - (startPadding + lastDay.getDate()); // 42 = 6 rows * 7 days
    for (let i = 1; i <= endPadding; i++) {
        addDayToCalendar(daysContainer, i, true);
    }
}

function addDayToCalendar(container, day, isOtherMonth) {
    const button = document.createElement('button');
    button.className = `aspect-square p-2 rounded-lg ${isOtherMonth ? 'text-gray-400' : ''} hover:bg-gray-50 transition focus:ring-2 focus:ring-[#ff6b6b] focus:outline-none`;
    button.onclick = () => openModal(day);
    
    const span = document.createElement('span');
    span.textContent = day;
    button.appendChild(span);
    
    container.appendChild(button);
}

// Close calendar when clicking outside
document.addEventListener('click', function(event) {
    const popup = document.getElementById('calendarPopup');
    const button = document.querySelector('[aria-label="Schedule new event"]');
    
    if (popup && !popup.contains(event.target) && !button.contains(event.target)) {
        popup.classList.add('hidden');
    }
});

// Load notifications HTML
document.addEventListener('DOMContentLoaded', function() {
    fetch('notificationmini.html')
        .then(response => response.text())
        .then(html => {
            // Create a container for notifications after the notifications button
            const notificationButton = document.querySelector('[data-i18n="notifications"]').closest('button');
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            notificationButton.parentNode.insertBefore(container, notificationButton.nextSibling);
            container.innerHTML = html;

            // Add click event listeners to all close buttons
            document.querySelectorAll('[aria-label="Close notification"]').forEach(button => {
                button.addEventListener("click", function() {
                    this.closest('[role="alertdialog"]').remove();
                    updateNotificationCount();
                    updateNotificationDisplay();
                });
            });

            loadNotifications();

            // Add click handlers for close buttons
            document.querySelectorAll('[role="alertdialog"] button').forEach(button => {
                button.addEventListener('click', () => closeNotification(button));
            });
        });
});

function toggleNotifications() {
    const notificationList = document.getElementById("notificationList");
    notificationList.classList.toggle("hidden");
}

function markAllAsRead() {
    const notifications = document.querySelectorAll("[role='alertdialog']");
    notifications.forEach(notification => {
        notification.classList.add("bg-gray-50");
        notification.classList.add("border-gray-300");
    });
    updateNotificationCount();
}

function clearAll() {
    const notificationItems = document.getElementById("notificationItems");
    notificationItems.innerHTML = `
        <!-- Empty state message -->
        <div id="emptyNotifications" class="text-center py-8">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            <p class="text-gray-500 text-sm" data-i18n="noNotifications">No notifications yet</p>
            <p class="text-gray-400 text-xs mt-1" data-i18n="checkBackLater">Check back later for updates</p>
        </div>
    `;
    updateNotificationCount();
}

function clearAllNotifications() {
    const notificationItems = document.getElementById('notificationItems');
    const notifications = notificationItems.querySelectorAll('[role="alertdialog"]');
    notifications.forEach(notification => notification.remove());
    updateNotificationDisplay();
}

function updateNotificationCount() {
    const count = document.querySelectorAll("[role='alertdialog']").length;
    const indicator = document.querySelector('.absolute.top-0.right-0');
    if (indicator) {
        if (count > 0) {
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.add('hidden');
        }
    }
}

function loadNotifications() {
    const notificationItems = document.getElementById("notificationItems");
    
    // Очищаем контейнер
    notificationItems.innerHTML = `
        <!-- Empty state message -->
        <div id="emptyNotifications" class="text-center py-8">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            <p class="text-gray-500 text-sm" data-i18n="noNotifications">No notifications yet</p>
            <p class="text-gray-400 text-xs mt-1" data-i18n="checkBackLater">Check back later for updates</p>
        </div>
        
        <!-- Sample notifications -->
        <div class="bg-white rounded-lg shadow-[0_2px_10px_rgba(255,127,80,0.2)] p-4 transform transition-all duration-300 hover:scale-102 border-l-4 border-[#FF6347]" role="alertdialog">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-gray-900 font-semibold text-sm">New Message</h3>
                    <p class="text-gray-600 mt-1 text-sm">You have received a new message from Sarah.</p>
                </div>
                <button class="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF7F50] rounded-full p-1" aria-label="Close notification">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;

    updateNotificationDisplay();
}

function updateNotificationDisplay() {
    const notificationItems = document.getElementById('notificationItems');
    const emptyNotifications = document.getElementById('emptyNotifications');
    const notifications = notificationItems.querySelectorAll('[role="alertdialog"]');
    
    // Показываем/скрываем сообщение о пустом состоянии
    if (notifications.length === 0) {
        if (emptyNotifications) {
            emptyNotifications.style.display = 'block';
        }
    } else {
        if (emptyNotifications) {
            emptyNotifications.style.display = 'none';
        }
    }
}

function closeNotification(button) {
    const notification = button.closest('[role="alertdialog"]');
    notification.remove();
    updateNotificationDisplay();
    updateNotificationCount();
}

// Close notifications when clicking outside
document.addEventListener('click', function(event) {
    const notificationList = document.getElementById('notificationList');
    const notificationButton = document.querySelector('[data-i18n="notifications"]').closest('button');
    
    if (notificationList && !notificationList.contains(event.target) && !notificationButton.contains(event.target)) {
        notificationList.classList.add('hidden');
    }
});

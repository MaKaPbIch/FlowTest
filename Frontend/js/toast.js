/**
 * Toast notifications for FlowTest application
 */

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of notification: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Get toast container or create it if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    
    // Set toast classes based on type
    toast.className = 'flex items-center p-4 mb-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out';
    
    let bgColor, icon;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            icon = 'ri-check-line';
            break;
        case 'error':
            bgColor = 'bg-red-500';
            icon = 'ri-close-line';
            break;
        case 'warning':
            bgColor = 'bg-yellow-500';
            icon = 'ri-alert-line';
            break;
        default: // info
            bgColor = 'bg-blue-500';
            icon = 'ri-information-line';
            break;
    }
    
    toast.classList.add(bgColor, 'text-white');
    
    // Create toast content
    toast.innerHTML = `
        <div class="flex items-center">
            <div class="mr-3">
                <i class="${icon} text-xl"></i>
            </div>
            <div>${message}</div>
        </div>
        <button class="ml-auto text-white focus:outline-none hover:text-gray-100" onclick="this.parentElement.remove()">
            <i class="ri-close-line"></i>
        </button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('translate-x-0', 'opacity-100');
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
    
    return toast;
}
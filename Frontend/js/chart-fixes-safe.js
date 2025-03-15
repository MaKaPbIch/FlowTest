/**
 * Chart.js fixes to prevent recursion errors
 * This file imports and applies the fixes directly without using eval()
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Applying Chart.js fixes safely without eval()');
    
    // Import fixed chart functions via script tags instead of eval
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Load both scripts concurrently
    Promise.all([
        loadScript('js/fixed-chart-changes.js'),
        loadScript('js/fixed-chart-editor.js')
    ])
    .then(() => {
        console.log('Successfully loaded chart fixes safely');
    })
    .catch(error => {
        console.error('Error loading chart fixes:', error);
    });
});
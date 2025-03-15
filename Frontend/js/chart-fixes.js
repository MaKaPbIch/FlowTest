/**
 * Chart.js fixes to prevent recursion errors
 * This file overrides problematic functions in report-manager.js
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Applying Chart.js fixes to prevent recursion errors');
    
    // Import our fixed functions from separate files
    fetch('js/fixed-chart-changes.js')
        .then(response => response.text())
        .then(code => {
            // Execute the code to override functions
            eval(code);
            console.log('Applied fixed applyChartChanges function');
        })
        .catch(error => {
            console.error('Error loading fixed chart changes:', error);
        });
    
    fetch('js/fixed-chart-editor.js')
        .then(response => response.text())
        .then(code => {
            // Execute the code to override functions
            eval(code);
            console.log('Applied fixed openChartEditor function');
        })
        .catch(error => {
            console.error('Error loading fixed chart editor:', error);
        });
});

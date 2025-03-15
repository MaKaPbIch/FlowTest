/**
 * Report Editor Main Module
 * 
 * This is the main entry point that loads all other modules
 */

// Paths to module files
const moduleFiles = [
    'js/report-modules/report-editor-core.js',
    'js/report-modules/report-editor-metrics.js',
    'js/report-modules/report-editor-charts.js',
    'js/report-modules/report-editor-elements.js',
    'js/report-modules/report-editor-templates.js'
];

// Function to load a JavaScript file
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // Keep execution order
        
        script.onload = () => {
            console.log(`Loaded module: ${src}`);
            resolve();
        };
        
        script.onerror = () => {
            console.error(`Failed to load module: ${src}`);
            reject(new Error(`Failed to load module: ${src}`));
        };
        
        document.head.appendChild(script);
    });
}

// Load all modules in sequence
async function loadAllModules() {
    console.log('Loading report editor modules...');
    try {
        for (const file of moduleFiles) {
            await loadScript(file);
        }
        console.log('All report editor modules loaded successfully');
        
        // Trigger initial setup if the page is already loaded
        if (document.readyState === 'complete') {
            console.log('Document already loaded, initializing editor');
            if (typeof initializeEditor === 'function') {
                initializeEditor();
            }
        }
    } catch (error) {
        console.error('Error loading report editor modules:', error);
        
        // Show error on the page
        const editorContainer = document.getElementById('report-editor-container');
        if (editorContainer) {
            editorContainer.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong class="font-bold">Error!</strong>
                    <span class="block sm:inline">Failed to load report editor modules: ${error.message}</span>
                </div>
            `;
        }
    }
}

// Load modules when the DOM is ready
document.addEventListener('DOMContentLoaded', loadAllModules);

// Console message to confirm the main module is loaded
console.log('Report Editor Main module loaded');
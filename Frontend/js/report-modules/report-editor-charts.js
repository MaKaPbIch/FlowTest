/**
 * Report Editor Charts Module
 * 
 * Provides functionality for adding and managing charts in the report
 */

/**
 * Add a chart to the report
 * @param {string} chartId - The chart ID
 * @param {HTMLElement} dropZone - The drop zone element
 */
function addChartToReport(chartId, dropZone) {
    // Create a unique ID for this chart instance
    const chartInstanceId = `chart-${chartId}-${Date.now()}`;
    
    // Add chart to the configuration
    const chartConfig = {
        id: chartInstanceId,
        type: chartId,
        title: getChartTitle(chartId),
        width: 800,
        height: 400,
        // New metrics configuration for customizable charts
        xAxis: 'timeStamp',
        yAxis: 'totalTests',
        showLegend: true,
        colorScheme: 'default'
    };
    
    currentTemplate.configuration.charts = currentTemplate.configuration.charts || [];
    currentTemplate.configuration.charts.push(chartConfig);
    
    // Create chart element
    const chartElement = document.createElement('div');
    chartElement.id = chartInstanceId;
    chartElement.className = 'chart-container relative';
    chartElement.style.width = '100%';
    chartElement.style.height = '400px';
    chartElement.setAttribute('data-chart-id', chartId);
    chartElement.setAttribute('data-instance-id', chartInstanceId);
    
    // Get sample chart data based on chart type for preview
    let chartData;
    let chartCanvas = '';
    
    // Get chart data based on type - supporting both legacy and new chart types
    switch (chartId) {
        case 'executionTrend':
            chartData = getExecutionTrendSampleData();
            chartCanvas = '<canvas class="chart-preview w-full h-full"></canvas>';
            break;
        case 'statusDistribution':
            chartData = getStatusDistributionSampleData();
            chartCanvas = '<canvas class="chart-preview w-full h-full"></canvas>';
            break;
        case 'testExecutionTime':
            chartData = getExecutionTimeSampleData();
            chartCanvas = '<canvas class="chart-preview w-full h-full"></canvas>';
            break;
        case 'testStability':
            chartData = getTestStabilitySampleData();
            chartCanvas = '<canvas class="chart-preview w-full h-full"></canvas>';
            break;
        // New chart types
        case 'line':
        case 'bar':
        case 'pie':
        case 'doughnut':
        case 'radar':
            // Generate data based on chart type
            chartData = getFallbackChartData(chartId);
            chartCanvas = '<canvas class="chart-preview w-full h-full"></canvas>';
            break;
        default:
            chartCanvas = `<div class="w-full h-full bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                <i class="ri-line-chart-line text-4xl text-gray-400 dark:text-gray-500"></i>
            </div>`;
    }
    
    // Get translatable title
    const chartTitle = getChartTitle(chartId);
    const translatedTitle = typeof i18n !== 'undefined' ? (i18n.t(chartId) || i18n.t(chartTitle) || chartTitle) : chartTitle;
    
    chartElement.innerHTML = `
        <div class="chart-controls">
            <button class="chart-control-btn edit-chart" data-instance-id="${chartInstanceId}">
                <i class="ri-settings-line mr-1"></i> <span data-i18n="settings">Settings</span>
            </button>
            <button class="chart-control-btn delete-chart" data-instance-id="${chartInstanceId}">
                <i class="ri-delete-bin-line mr-1"></i> <span data-i18n="delete">Delete</span>
            </button>
        </div>
        <h3 class="text-lg font-medium mb-4">${translatedTitle}</h3>
        <div class="chart-placeholder w-full h-64">
            ${chartCanvas}
        </div>
        <div class="chart-resizer">
            <i class="ri-drag-move-line"></i>
        </div>
        <div class="resize-handle se"></div>
    `;
    
    // Ensure there's proper margin between charts and clean styling
    chartElement.style.margin = '32px 0';
    chartElement.style.clear = 'both';
    
    // Create a wrapper div to ensure proper layout
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'chart-wrapper';
    chartWrapper.style.marginBottom = '32px';
    chartWrapper.style.width = '100%';
    
    // Add chart to wrapper, then wrapper to drop zone
    chartWrapper.appendChild(chartElement);
    dropZone.appendChild(chartWrapper);
    
    // Initialize chart if we have data
    if (chartData) {
        const canvas = chartElement.querySelector('canvas.chart-preview');
        if (canvas) {
            // Add a slight delay to ensure canvas is properly rendered in DOM
            setTimeout(() => {
                try {
                    initializeChartPreview(canvas, chartId, chartData);
                    console.log(`Chart ${chartId} initialized successfully`);
                } catch (err) {
                    console.error(`Error initializing chart ${chartId}:`, err);
                }
            }, 100);
        }
    }
    
    // Make chart element draggable for repositioning
    makeChartDraggable(chartElement);
    
    // Make chart resizable
    makeChartResizable(chartElement);
    
    // Add event listeners for chart controls
    addChartControlEventListeners(chartElement);
    
    // Add chart to the list of chart elements
    chartElements.push({
        id: chartInstanceId,
        element: chartElement,
        config: chartConfig
    });
}

/**
 * Helper function to initialize chart preview
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} chartType - Chart type
 * @param {Object} chartData - Chart data
 */
function initializeChartPreview(canvas, chartType, chartData) {
    if (!canvas) {
        console.error('Canvas element is null or undefined');
        return;
    }

    // Force canvas to be visible and have dimensions
    canvas.style.display = 'block';
    canvas.style.height = '100%';
    canvas.style.width = '100%';
    canvas.height = canvas.offsetHeight || 300;
    canvas.width = canvas.offsetWidth || 400;

    // Determine actual chart type based on legacy or new types
    let actualChartType;
    switch (chartType) {
        case 'executionTrend':
            actualChartType = 'line';
            break;
        case 'statusDistribution':
            actualChartType = 'pie';
            break;
        case 'testExecutionTime':
        case 'testStability':
            actualChartType = 'bar';
            break;
        default:
            actualChartType = chartType; // For new types: line, bar, pie, etc.
    }
    
    // Define basic chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            tooltip: {
                callbacks: {
                    title: function(tooltipItems) {
                        // Translate tooltip title if needed
                        const title = tooltipItems[0].label;
                        return i18n ? i18n.t(title) || title : title;
                    },
                    label: function(context) {
                        // Translate tooltip label if needed
                        let label = context.dataset.label || '';
                        if (i18n && label) {
                            label = i18n.t(label) || label;
                        }
                        return label + ': ' + context.parsed.y;
                    }
                }
            }
        },
        animation: {
            duration: 500 // Shorter animation for better performance
        }
    };
    
    // Add specific options for different chart types
    if (['line', 'bar'].includes(actualChartType)) {
        chartOptions.scales = {
            y: {
                beginAtZero: true,
                ticks: {
                    color: document.body.classList.contains('dark') ? '#fff' : '#666'
                },
                grid: {
                    color: document.body.classList.contains('dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }
            },
            x: {
                ticks: {
                    color: document.body.classList.contains('dark') ? '#fff' : '#666'
                },
                grid: {
                    color: document.body.classList.contains('dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }
            }
        };
    }
    
    // Create chart config
    const chartConfig = {
        type: actualChartType,
        data: chartData,
        options: chartOptions
    };
    
    try {
        // Check if chart already exists and destroy it
        let existingChart;
        try {
            existingChart = Chart.getChart(canvas);
        } catch (e) {
            console.log('No existing chart found, creating new one');
        }
        
        if (existingChart) {
            existingChart.destroy();
        }
        
        // Create new chart
        console.log(`Creating new ${actualChartType} chart`);
        new Chart(canvas, chartConfig);
    } catch (error) {
        console.error('Error initializing chart preview:', error);
        
        // Fallback - create a basic visualization for the chart
        try {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = document.body.classList.contains('dark') ? '#334155' : '#f1f5f9';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = document.body.classList.contains('dark') ? '#fff' : '#000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${chartType} Chart Preview`, canvas.width/2, canvas.height/2);
        } catch (e) {
            console.error('Fallback rendering also failed:', e);
        }
    }
}

/**
 * Functions to generate sample chart data
 */
function getExecutionTrendSampleData() {
    // Get translatable labels
    let passedLabel = 'Passed';
    let failedLabel = 'Failed';
    let skippedLabel = 'Skipped';
    
    // Try to translate if i18n is available
    if (typeof i18n !== 'undefined') {
        passedLabel = i18n.t('passedTests') || passedLabel;
        failedLabel = i18n.t('failedTests') || failedLabel;
        skippedLabel = i18n.t('skippedTests') || skippedLabel;
    }
    
    return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: passedLabel,
                data: [65, 59, 80, 81, 56, 55, 40],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)'
            },
            {
                label: failedLabel,
                data: [28, 12, 40, 19, 28, 27, 10],
                borderColor: '#F44336',
                backgroundColor: 'rgba(244, 67, 54, 0.1)'
            },
            {
                label: skippedLabel,
                data: [10, 5, 12, 9, 5, 4, 8],
                borderColor: '#FFC107',
                backgroundColor: 'rgba(255, 193, 7, 0.1)'
            }
        ]
    };
}

function getStatusDistributionSampleData() {
    // Get translatable labels
    let passedLabel = 'Passed';
    let failedLabel = 'Failed';
    let skippedLabel = 'Skipped';
    
    // Try to translate if i18n is available
    if (typeof i18n !== 'undefined') {
        passedLabel = i18n.t('passedTests') || passedLabel;
        failedLabel = i18n.t('failedTests') || failedLabel;
        skippedLabel = i18n.t('skippedTests') || skippedLabel;
    }
    
    return {
        labels: [passedLabel, failedLabel, skippedLabel],
        datasets: [{
            data: [70, 20, 10],
            backgroundColor: [
                '#4CAF50',  // Green
                '#F44336',  // Red
                '#FFC107'   // Yellow
            ]
        }]
    };
}

function getExecutionTimeSampleData() {
    // Get translatable label
    let executionTimeLabel = 'Execution Time (s)';
    
    // Try to translate if i18n is available
    if (typeof i18n !== 'undefined') {
        executionTimeLabel = i18n.t('executionTime') || executionTimeLabel;
    }
    
    return {
        labels: ['Test A', 'Test B', 'Test C', 'Test D', 'Test E'],
        datasets: [{
            label: executionTimeLabel,
            data: [120, 90, 60, 45, 30],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };
}

function getTestStabilitySampleData() {
    // Get translatable label
    let stabilityLabel = 'Stability (%)';
    
    // Try to translate if i18n is available
    if (typeof i18n !== 'undefined') {
        stabilityLabel = i18n.t('testStability') || stabilityLabel;
    }
    
    return {
        labels: ['Test A', 'Test B', 'Test C', 'Test D', 'Test E'],
        datasets: [{
            label: stabilityLabel,
            data: [95, 85, 75, 65, 55],
            backgroundColor: [
                'rgba(13, 220, 0, 0.7)',
                'rgba(92, 220, 0, 0.7)',
                'rgba(160, 220, 0, 0.7)',
                'rgba(255, 160, 0, 0.7)',
                'rgba(255, 80, 0, 0.7)'
            ]
        }]
    };
}

/**
 * Get the title for a chart based on its ID
 * @param {string} chartId - The chart ID
 * @returns {string} The chart title
 */
function getChartTitle(chartId) {
    switch (chartId) {
        case 'executionTrend':
            return 'Test Execution Trend';
        case 'statusDistribution':
            return 'Test Status Distribution';
        case 'testExecutionTime':
            return 'Test Execution Time';
        case 'testStability':
            return 'Test Stability';
        default:
            return 'Chart';
    }
}

/**
 * Make a chart element draggable
 * @param {HTMLElement} chartElement - The chart element
 */
function makeChartDraggable(chartElement) {
    chartElement.setAttribute('draggable', 'true');
    
    chartElement.addEventListener('dragstart', (e) => {
        const instanceId = chartElement.getAttribute('data-instance-id');
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            elementType: 'chart',
            id: chartElement.getAttribute('data-chart-id'),
            elementId: instanceId,
            isNew: false
        }));
        
        chartElement.classList.add('opacity-50');
    });
    
    chartElement.addEventListener('dragend', () => {
        chartElement.classList.remove('opacity-50');
    });
}

/**
 * Make a chart element resizable
 * @param {HTMLElement} chartElement - The chart element
 */
function makeChartResizable(chartElement) {
    const resizer = chartElement.querySelector('.chart-resizer');
    const seHandle = chartElement.querySelector('.resize-handle.se');
    
    if (resizer) {
        resizer.addEventListener('mousedown', initResize, false);
    }
    
    if (seHandle) {
        seHandle.addEventListener('mousedown', initResize, false);
    }
    
    function initResize(e) {
        e.preventDefault();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = chartElement.offsetWidth;
        const startHeight = chartElement.offsetHeight;
        
        // Store the instance ID
        const instanceId = chartElement.getAttribute('data-instance-id');
        
        // Find the chart config
        const chartConfig = currentTemplate.configuration.charts.find(chart => chart.id === instanceId);
        
        document.addEventListener('mousemove', resize, false);
        document.addEventListener('mouseup', stopResize, false);
        
        function resize(e) {
            const width = startWidth + e.clientX - startX;
            const height = startHeight + e.clientY - startY;
            
            chartElement.style.width = `${width}px`;
            chartElement.style.height = `${height}px`;
            
            // Update chart config
            if (chartConfig) {
                chartConfig.width = width;
                chartConfig.height = height;
            }
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize, false);
            document.removeEventListener('mouseup', stopResize, false);
        }
    }
}

/**
 * Add event listeners for chart controls
 * @param {HTMLElement} chartElement - The chart element
 */
function addChartControlEventListeners(chartElement) {
    const editButton = chartElement.querySelector('.edit-chart');
    const deleteButton = chartElement.querySelector('.delete-chart');
    
    if (editButton) {
        editButton.addEventListener('click', () => {
            const instanceId = editButton.getAttribute('data-instance-id');
            openChartSettings(instanceId);
        });
    }
    
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const instanceId = deleteButton.getAttribute('data-instance-id');
            removeChartFromReport(instanceId);
        });
    }
}

/**
 * Open chart settings modal
 * @param {string} chartInstanceId - The chart instance ID
 */
function openChartSettings(chartInstanceId) {
    const chartSettingsModal = document.getElementById('chart-settings-modal');
    if (!chartSettingsModal) return;
    
    // Find the chart config
    const chartConfig = currentTemplate.configuration.charts.find(chart => chart.id === chartInstanceId);
    if (!chartConfig) return;
    
    // Set the current element for reference
    currentElement = {
        type: 'chart',
        id: chartInstanceId,
        config: chartConfig
    };
    
    // Set form values
    const chartTitleInput = document.getElementById('chart-title');
    const chartWidthInput = document.getElementById('chart-width');
    const chartHeightInput = document.getElementById('chart-height');
    const chartTypeSelector = document.getElementById('chart-type-selector');
    const xAxisMetric = document.getElementById('x-axis-metric');
    const yAxisMetric = document.getElementById('y-axis-metric');
    const showLegend = document.getElementById('show-legend');
    
    if (chartTitleInput) chartTitleInput.value = chartConfig.title || '';
    if (chartWidthInput) chartWidthInput.value = chartConfig.width || 800;
    if (chartHeightInput) chartHeightInput.value = chartConfig.height || 400;
    
    // Set chart type in selector
    if (chartTypeSelector) {
        // Find option with matching value
        const chartTypeOption = Array.from(chartTypeSelector.options).find(
            option => option.value === chartConfig.type
        );
        
        // If found, select it, otherwise default to first option
        if (chartTypeOption) {
            chartTypeSelector.value = chartConfig.type;
        } else {
            // For legacy chart types (executionTrend, statusDistribution, etc.)
            // Map to new generic types
            switch (chartConfig.type) {
                case 'executionTrend':
                    chartTypeSelector.value = 'line';
                    break;
                case 'statusDistribution':
                    chartTypeSelector.value = 'pie';
                    break;
                case 'testExecutionTime':
                case 'testStability':
                    chartTypeSelector.value = 'bar';
                    break;
                default:
                    chartTypeSelector.value = 'line';
            }
        }
    }
    
    // Set axis metrics
    if (xAxisMetric) {
        xAxisMetric.value = chartConfig.xAxis || 'timeStamp';
    }
    
    if (yAxisMetric) {
        yAxisMetric.value = chartConfig.yAxis || 'totalTests';
    }
    
    // Set show legend checkbox
    if (showLegend) {
        showLegend.checked = chartConfig.showLegend !== false;
    }
    
    // Show chart-specific options
    const chartTypeOptions = document.getElementById('chart-type-options');
    if (chartTypeOptions) {
        chartTypeOptions.classList.remove('hidden');
        
        // Clear previous options
        chartTypeOptions.innerHTML = '';
        
        // Add options based on chart type
        switch (chartConfig.type) {
            case 'executionTrend':
            case 'line':
                chartTypeOptions.innerHTML = `
                    <div class="space-y-3">
                        <div class="flex items-center">
                            <input id="show-passed" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.showPassed !== false ? 'checked' : ''}>
                            <label for="show-passed" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300" data-i18n="showPassed">Show Passed Tests</label>
                        </div>
                        <div class="flex items-center">
                            <input id="show-failed" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.showFailed !== false ? 'checked' : ''}>
                            <label for="show-failed" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300" data-i18n="showFailed">Show Failed Tests</label>
                        </div>
                        <div class="flex items-center">
                            <input id="show-grid" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.showGrid !== false ? 'checked' : ''}>
                            <label for="show-grid" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Show Grid Lines</label>
                        </div>
                        <div class="flex items-center">
                            <input id="enable-animation" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.enableAnimation !== false ? 'checked' : ''}>
                            <label for="enable-animation" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Enable Animation</label>
                        </div>
                    </div>
                `;
                break;
            case 'bar':
            case 'testExecutionTime':
            case 'testStability':
                chartTypeOptions.innerHTML = `
                    <div class="space-y-3">
                        <div>
                            <label for="limit-entries" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300" data-i18n="limitEntries">Limit Entries</label>
                            <input type="number" id="limit-entries" min="5" max="20" value="${chartConfig.limit || 10}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-coral-500 focus:border-coral-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-coral-500 dark:focus:border-coral-500">
                        </div>
                        <div class="flex items-center">
                            <input id="show-grid" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.showGrid !== false ? 'checked' : ''}>
                            <label for="show-grid" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Show Grid Lines</label>
                        </div>
                    </div>
                `;
                break;
            case 'pie':
            case 'doughnut':
            case 'statusDistribution':
                chartTypeOptions.innerHTML = `
                    <div class="space-y-3">
                        <div class="flex items-center">
                            <input id="enable-animation" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.enableAnimation !== false ? 'checked' : ''}>
                            <label for="enable-animation" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Enable Animation</label>
                        </div>
                    </div>
                `;
                break;
            case 'radar':
                chartTypeOptions.innerHTML = `
                    <div class="space-y-3">
                        <div class="flex items-center">
                            <input id="fill-area" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.fillArea !== false ? 'checked' : ''}>
                            <label for="fill-area" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Fill Area</label>
                        </div>
                    </div>
                `;
                break;
        }
    }
    
    // Show modal
    chartSettingsModal.classList.remove('hidden');
    chartSettingsModal.classList.add('flex');
}

/**
 * Apply chart settings to the element
 */
function applyChartSettingsToElement() {
    if (!currentElement || currentElement.type !== 'chart') return;
    
    const chartSettingsModal = document.getElementById('chart-settings-modal');
    const chartTitleInput = document.getElementById('chart-title');
    const chartWidthInput = document.getElementById('chart-width');
    const chartHeightInput = document.getElementById('chart-height');
    const chartTypeSelector = document.getElementById('chart-type-selector');
    const xAxisMetric = document.getElementById('x-axis-metric');
    const yAxisMetric = document.getElementById('y-axis-metric');
    const showLegend = document.getElementById('show-legend');
    
    // Get chart element
    const chartElement = document.getElementById(currentElement.id);
    if (!chartElement) return;
    
    // Update chart title in the element
    const chartTitleElement = chartElement.querySelector('h3');
    if (chartTitleElement && chartTitleInput) {
        chartTitleElement.textContent = chartTitleInput.value;
    }
    
    // Update chart dimensions
    if (chartWidthInput && chartHeightInput) {
        chartElement.style.width = `${chartWidthInput.value}px`;
        chartElement.style.height = `${chartHeightInput.value}px`;
    }
    
    // Update chart config
    const chartConfig = currentTemplate.configuration.charts.find(chart => chart.id === currentElement.id);
    if (chartConfig) {
        if (chartTitleInput) chartConfig.title = chartTitleInput.value;
        if (chartWidthInput) chartConfig.width = parseInt(chartWidthInput.value, 10);
        if (chartHeightInput) chartConfig.height = parseInt(chartHeightInput.value, 10);
        
        // Update chart type if changed
        if (chartTypeSelector) {
            // Save old type in case we need it for legacy compatibility
            const oldType = chartConfig.type;
            chartConfig.type = chartTypeSelector.value;
            
            // Update the chart element's data attribute
            chartElement.setAttribute('data-chart-id', chartConfig.type);
        }
        
        // Update axis metrics
        if (xAxisMetric) chartConfig.xAxis = xAxisMetric.value;
        if (yAxisMetric) chartConfig.yAxis = yAxisMetric.value;
        
        // Update show legend setting
        if (showLegend) chartConfig.showLegend = showLegend.checked;
        
        // Update chart-specific options
        switch (chartConfig.type) {
            case 'executionTrend':
            case 'line':
                const showPassed = document.getElementById('show-passed');
                const showFailed = document.getElementById('show-failed');
                const showGrid = document.getElementById('show-grid');
                const enableAnimation = document.getElementById('enable-animation');
                
                if (showPassed) chartConfig.showPassed = showPassed.checked;
                if (showFailed) chartConfig.showFailed = showFailed.checked;
                if (showGrid) chartConfig.showGrid = showGrid.checked;
                if (enableAnimation) chartConfig.enableAnimation = enableAnimation.checked;
                break;
                
            case 'bar':
            case 'testExecutionTime':
            case 'testStability':
                const limitEntries = document.getElementById('limit-entries');
                const barShowGrid = document.getElementById('show-grid');
                
                if (limitEntries) chartConfig.limit = parseInt(limitEntries.value, 10);
                if (barShowGrid) chartConfig.showGrid = barShowGrid.checked;
                break;
                
            case 'pie':
            case 'doughnut':
            case 'statusDistribution':
                const pieEnableAnimation = document.getElementById('enable-animation');
                if (pieEnableAnimation) chartConfig.enableAnimation = pieEnableAnimation.checked;
                break;
                
            case 'radar':
                const fillArea = document.getElementById('fill-area');
                if (fillArea) chartConfig.fillArea = fillArea.checked;
                break;
        }
        
        // After updating the config, refresh the chart if it exists
        const canvas = chartElement.querySelector('canvas.chart-preview');
        if (canvas) {
            // Get existing Chart.js instance if it exists
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
            }
            
            // Get new chart data based on selected metrics
            fetchCustomChartData(currentTemplate.project, chartConfig.xAxis, chartConfig.yAxis)
                .then(chartData => {
                    initializeCustomChart(canvas, chartConfig, chartData);
                })
                .catch(error => {
                    console.error('Error refreshing chart:', error);
                    // Use fallback data
                    const fallbackData = getFallbackChartData(chartConfig.type);
                    initializeCustomChart(canvas, chartConfig, fallbackData);
                });
        }
    }
    
    // Close modal
    chartSettingsModal.classList.add('hidden');
    chartSettingsModal.classList.remove('flex');
    
    // Clear current element
    currentElement = null;
}

/**
 * Fetch custom chart data based on selected metrics
 * @param {number} projectId - Project ID
 * @param {string} xAxis - X-axis metric
 * @param {string} yAxis - Y-axis metric
 * @returns {Promise<Object>} Chart data object
 */
async function fetchCustomChartData(projectId, xAxis, yAxis) {
    try {
        // In a real implementation, this would make an API call
        // For now, generate sample data based on the selected metrics
        console.log(`Fetching custom chart data for metrics: x=${xAxis}, y=${yAxis}`);
        
        // Generate labels based on x-axis metric
        let labels = [];
        
        if (xAxis === 'timeStamp') {
            // Generate date labels for the last 7 days
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(today.getDate() - i);
                labels.push(date.toLocaleDateString());
            }
        } else if (xAxis === 'testName') {
            labels = ['Login Test', 'Registration Test', 'Search Test', 'Checkout Test', 'Profile Test'];
        } else if (xAxis === 'component') {
            labels = ['Authentication', 'User Interface', 'Database', 'API', 'Payment'];
        } else if (xAxis === 'priority') {
            labels = ['Critical', 'High', 'Medium', 'Low', 'Trivial'];
        }
        
        // Generate data values based on y-axis metric
        let data = [];
        
        switch (yAxis) {
            case 'totalTests':
                data = labels.map(() => Math.floor(Math.random() * 100) + 50);
                break;
            case 'successRate':
                data = labels.map(() => Math.floor(Math.random() * 30) + 70);
                break;
            case 'failedTests':
                data = labels.map(() => Math.floor(Math.random() * 50));
                break;
            case 'averageTime':
                data = labels.map(() => Math.floor(Math.random() * 120) + 30);
                break;
            case 'testStability':
                data = labels.map(() => Math.floor(Math.random() * 30) + 70);
                break;
            case 'blockedTests':
                data = labels.map(() => Math.floor(Math.random() * 15));
                break;
            case 'automationRate':
                data = labels.map(() => Math.floor(Math.random() * 40) + 60);
                break;
            case 'flakiness':
                data = labels.map(() => Math.floor(Math.random() * 20));
                break;
            default:
                data = labels.map(() => Math.floor(Math.random() * 100));
        }
        
        // Return data in Chart.js format
        return {
            labels: labels,
            datasets: [{
                label: getMetricLabel(yAxis),
                data: data,
                backgroundColor: 'rgba(255, 99, 71, 0.2)',
                borderColor: 'rgb(255, 99, 71)',
                borderWidth: 2
            }]
        };
    } catch (error) {
        console.error('Error fetching custom chart data:', error);
        throw error;
    }
}

/**
 * Get human-readable label for a metric
 * @param {string} metricId - Metric ID
 * @returns {string} Human-readable label
 */
function getMetricLabel(metricId) {
    const metricLabels = {
        'totalTests': 'Total Tests',
        'successRate': 'Success Rate',
        'failedTests': 'Failed Tests',
        'averageTime': 'Average Time',
        'testStability': 'Test Stability',
        'blockedTests': 'Blocked Tests',
        'automationRate': 'Automation Rate',
        'flakiness': 'Flakiness',
        'testsByPriority': 'Tests by Priority'
    };
    
    return metricLabels[metricId] || metricId;
}

/**
 * Initialize a custom chart with the provided configuration and data
 * @param {HTMLElement} canvas - Canvas element for the chart
 * @param {Object} chartConfig - Chart configuration
 * @param {Object} chartData - Chart data
 */
function initializeCustomChart(canvas, chartConfig, chartData) {
    // Determine chart type and options based on configuration
    const chartType = chartConfig.type || 'line';
    
    // Define chart options based on type and config
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: chartConfig.showLegend !== false,
                position: 'top'
            },
            title: {
                display: !!chartConfig.title,
                text: chartConfig.title || ''
            }
        },
        animation: {
            duration: chartConfig.enableAnimation !== false ? 1000 : 0
        }
    };
    
    // Add axis options for charts that support them
    if (['line', 'bar'].includes(chartType)) {
        chartOptions.scales = {
            x: {
                title: {
                    display: true,
                    text: getMetricLabel(chartConfig.xAxis || 'timeStamp')
                },
                grid: {
                    display: chartConfig.showGrid !== false
                }
            },
            y: {
                title: {
                    display: true,
                    text: getMetricLabel(chartConfig.yAxis || 'totalTests')
                },
                grid: {
                    display: chartConfig.showGrid !== false
                },
                beginAtZero: true
            }
        };
    }
    
    // Special options for radar charts
    if (chartType === 'radar') {
        chartOptions.elements = {
            line: {
                borderWidth: 2,
                fill: chartConfig.fillArea !== false
            }
        };
    }
    
    // Create the chart
    try {
        new Chart(canvas, {
            type: chartType,
            data: chartData,
            options: chartOptions
        });
        console.log(`Custom chart created with type: ${chartType}`);
    } catch (error) {
        console.error('Error creating custom chart:', error);
    }
}

/**
 * Get fallback chart data for a given chart type
 * @param {string} chartType - Chart type (line, bar, pie, etc.)
 * @returns {Object} Fallback chart data
 */
function getFallbackChartData(chartType) {
    // Default labels and data
    const labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    if (chartType === 'pie' || chartType === 'doughnut' || chartType === 'statusDistribution') {
        return {
            labels: ['Passed', 'Failed', 'Skipped'],
            datasets: [{
                data: [70, 20, 10],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 205, 86, 0.6)'
                ],
                borderColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 99, 132)',
                    'rgb(255, 205, 86)'
                ],
                borderWidth: 1
            }]
        };
    } else if (chartType === 'radar') {
        return {
            labels: ['Performance', 'Reliability', 'Usability', 'Security', 'Functionality'],
            datasets: [{
                label: 'Test Coverage',
                data: [85, 70, 90, 65, 80],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 2,
                pointBackgroundColor: 'rgb(54, 162, 235)'
            }]
        };
    } else {
        // Line or bar chart data
        return {
            labels: labels,
            datasets: [{
                label: 'Test Executions',
                data: [12, 19, 3, 5, 2, 3, 7],
                backgroundColor: 'rgba(255, 99, 71, 0.2)',
                borderColor: 'rgb(255, 99, 71)',
                borderWidth: 2
            }]
        };
    }
}

/**
 * Remove a chart from the report
 * @param {string} chartInstanceId - The chart instance ID
 */
function removeChartFromReport(chartInstanceId) {
    // Remove chart element from the DOM
    const chartElement = document.getElementById(chartInstanceId);
    if (chartElement) {
        chartElement.remove();
    }
    
    // Remove chart from the configuration
    const index = currentTemplate.configuration.charts.findIndex(chart => chart.id === chartInstanceId);
    if (index !== -1) {
        currentTemplate.configuration.charts.splice(index, 1);
    }
    
    // Remove chart from the chart elements list
    const chartIndex = chartElements.findIndex(chart => chart.id === chartInstanceId);
    if (chartIndex !== -1) {
        chartElements.splice(chartIndex, 1);
    }
}

// Export functions for use in other modules
window.addChartToReport = addChartToReport;
window.initializeChartPreview = initializeChartPreview;
window.getExecutionTrendSampleData = getExecutionTrendSampleData;
window.getStatusDistributionSampleData = getStatusDistributionSampleData;
window.getExecutionTimeSampleData = getExecutionTimeSampleData;
window.getTestStabilitySampleData = getTestStabilitySampleData;
window.getChartTitle = getChartTitle;
window.makeChartDraggable = makeChartDraggable;
window.makeChartResizable = makeChartResizable;
window.addChartControlEventListeners = addChartControlEventListeners;
window.openChartSettings = openChartSettings;
window.applyChartSettingsToElement = applyChartSettingsToElement;
window.fetchCustomChartData = fetchCustomChartData;
window.getMetricLabel = getMetricLabel;
window.initializeCustomChart = initializeCustomChart;
window.getFallbackChartData = getFallbackChartData;
window.removeChartFromReport = removeChartFromReport;
/**
 * Chart Designer Module
 * A comprehensive tool for creating and customizing charts for FlowTest reports.
 * Supports various chart types, data sources, and customization options.
 */

const ChartDesigner = {
    // Current chart instance
    chart: null,
    
    // Current chart configuration
    config: {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Dataset 1',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    enabled: true
                },
                datalabels: {
                    display: false,
                    color: '#fff',
                    font: {
                        weight: 'bold'
                    },
                    formatter: (value) => value
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'X Axis'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Y Axis'
                    },
                    beginAtZero: true
                }
            },
            animation: {
                duration: 1000
            }
        }
    },
    
    // Color schemes
    colorSchemes: {
        default: ['#4BC0C0', '#36A2EB', '#9966FF', '#FF6384', '#FFCD56'],
        pastel: ['#95DBE5', '#A0D9CC', '#B8D9AC', '#D9C199', '#D99484'],
        vibrant: ['#FF3E4D', '#FF892E', '#60D394', '#2176FF', '#8E4DFF'],
        monochrome: ['#333333', '#666666', '#999999', '#CCCCCC', '#EEEEEE'],
        custom: [] // Will be populated by user
    },
    
    // Sample data for each data source
    sampleData: {
        testExecution: {
            labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            datasets: [{
                label: 'Passed Tests',
                data: [65, 72, 86, 81, 90, 75, 80],
                backgroundColor: '#10B981'
            }, {
                label: 'Failed Tests',
                data: [12, 8, 5, 7, 4, 3, 6],
                backgroundColor: '#EF4444'
            }]
        },
        testResults: {
            labels: ['Passed', 'Failed', 'Skipped'],
            datasets: [{
                data: [70, 15, 15],
                backgroundColor: ['#10B981', '#EF4444', '#F59E0B']
            }]
        },
        testPriority: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                label: 'Number of Tests',
                data: [15, 45, 20],
                backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6']
            }]
        },
        executionTime: {
            labels: ['Test A', 'Test B', 'Test C', 'Test D', 'Test E'],
            datasets: [{
                label: 'Execution Time (s)',
                data: [3.5, 5.2, 7.1, 2.3, 4.8],
                backgroundColor: '#8B5CF6'
            }]
        },
        testStability: {
            labels: ['Test 1', 'Test 2', 'Test 3', 'Test 4', 'Test 5'],
            datasets: [{
                label: 'Stability Score',
                data: [95, 82, 65, 97, 78],
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#10B981', '#F59E0B']
            }]
        }
    },
    
    /**
     * Initialize the chart designer
     */
    init() {
        this.initChart();
        this.initEventListeners();
        this.loadTemplates();
        this.setupExportOptions();
        
        // Register Chart.js plugins
        Chart.register(ChartDataLabels);
    },
    
    /**
     * Initialize the chart with default settings
     */
    initChart() {
        const ctx = document.getElementById('previewChart');
        if (!ctx) return;
        
        // Apply default colors
        this.applyColorScheme('default');
        
        // Create initial chart
        this.chart = new Chart(ctx, this.config);
        
        // Set default data from test execution sample
        this.updateChartData('testExecution');
        
        // Update table with the data
        this.updateDataTable();
    },
    
    /**
     * Initialize all event listeners
     */
    initEventListeners() {
        // Chart type change
        const chartTypeSelect = document.getElementById('chartType');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', (e) => {
                this.updateChartType(e.target.value);
            });
        }
        
        // Data source change
        const dataSourceSelect = document.getElementById('dataSource');
        if (dataSourceSelect) {
            dataSourceSelect.addEventListener('change', (e) => {
                this.updateChartData(e.target.value);
            });
        }
        
        // Time range change
        const timeRangeSelect = document.getElementById('timeRange');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    document.getElementById('customDateRange').classList.remove('hidden');
                } else {
                    document.getElementById('customDateRange').classList.add('hidden');
                }
                
                // We would update the data based on time range here
                this.refreshChart();
            });
        }
        
        // Axis configuration
        const xAxisSelect = document.getElementById('xAxis');
        const yAxisSelect = document.getElementById('yAxis');
        const xAxisLabel = document.getElementById('xAxisLabel');
        const yAxisLabel = document.getElementById('yAxisLabel');
        
        if (xAxisSelect) {
            xAxisSelect.addEventListener('change', () => this.updateAxisConfiguration());
        }
        
        if (yAxisSelect) {
            yAxisSelect.addEventListener('change', () => this.updateAxisConfiguration());
        }
        
        if (xAxisLabel) {
            xAxisLabel.addEventListener('change', () => this.updateAxisConfiguration());
            xAxisLabel.addEventListener('blur', () => this.updateAxisConfiguration());
        }
        
        if (yAxisLabel) {
            yAxisLabel.addEventListener('change', () => this.updateAxisConfiguration());
            yAxisLabel.addEventListener('blur', () => this.updateAxisConfiguration());
        }
        
        // Visual settings
        const colorSchemeBtns = document.querySelectorAll('.color-scheme-btn');
        colorSchemeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scheme = e.target.closest('.color-scheme-btn').dataset.scheme;
                if (scheme === 'custom') {
                    this.openCustomColorModal();
                } else {
                    this.applyColorScheme(scheme);
                    this.refreshChart();
                }
            });
        });
        
        // Show/hide legend
        const showLegendCheckbox = document.getElementById('showLegend');
        if (showLegendCheckbox) {
            showLegendCheckbox.addEventListener('change', (e) => {
                this.config.options.plugins.legend.display = e.target.checked;
                this.refreshChart();
            });
        }
        
        // Show/hide data labels
        const showDataLabelsCheckbox = document.getElementById('showDataLabels');
        if (showDataLabelsCheckbox) {
            showDataLabelsCheckbox.addEventListener('change', (e) => {
                this.config.options.plugins.datalabels.display = e.target.checked;
                this.refreshChart();
            });
        }
        
        // Enable/disable animation
        const enableAnimationCheckbox = document.getElementById('enableAnimation');
        if (enableAnimationCheckbox) {
            enableAnimationCheckbox.addEventListener('change', (e) => {
                this.config.options.animation.duration = e.target.checked ? 1000 : 0;
                this.refreshChart();
            });
        }
        
        // Advanced settings
        const advancedSettingsBtn = document.getElementById('advancedSettingsBtn');
        const advancedSettingsPanel = document.getElementById('advancedSettingsPanel');
        
        if (advancedSettingsBtn && advancedSettingsPanel) {
            advancedSettingsBtn.addEventListener('click', () => {
                advancedSettingsPanel.classList.toggle('hidden');
                const icon = advancedSettingsBtn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('ri-arrow-down-s-line');
                    icon.classList.toggle('ri-arrow-up-s-line');
                }
            });
        }
        
        // Apply advanced settings
        const applyAdvancedSettingsBtn = document.getElementById('applyAdvancedSettings');
        if (applyAdvancedSettingsBtn) {
            applyAdvancedSettingsBtn.addEventListener('click', () => {
                this.applyAdvancedSettings();
            });
        }
        
        // Add filter
        const addFilterBtn = document.getElementById('addFilterBtn');
        if (addFilterBtn) {
            addFilterBtn.addEventListener('click', () => {
                this.addFilterRow();
            });
        }
        
        // Remove filter - delegated event
        const filterContainer = document.getElementById('filterContainer');
        if (filterContainer) {
            filterContainer.addEventListener('click', (e) => {
                if (e.target.closest('.remove-filter')) {
                    e.target.closest('.flex.items-center').remove();
                }
            });
        }
        
        // Template actions
        const createNewTemplateBtn = document.getElementById('createNewTemplateBtn');
        if (createNewTemplateBtn) {
            createNewTemplateBtn.addEventListener('click', () => {
                this.openTemplateSettingsModal();
            });
        }
        
        const saveTemplateBtn = document.getElementById('saveTemplateBtn');
        if (saveTemplateBtn) {
            saveTemplateBtn.addEventListener('click', () => {
                this.saveCurrentTemplate();
            });
        }
        
        const loadTemplateBtn = document.getElementById('loadTemplateBtn');
        if (loadTemplateBtn) {
            loadTemplateBtn.addEventListener('click', () => {
                // In a real implementation, this would show a list of templates to load
                this.loadTemplateById(1); // Load first template for demo
            });
        }
        
        // Saved template cards
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const templateId = e.currentTarget.dataset.id || 1;
                this.loadTemplateById(templateId);
            });
        });
        
        const addTemplateCard = document.querySelector('.add-template-card');
        if (addTemplateCard) {
            addTemplateCard.addEventListener('click', () => {
                this.openTemplateSettingsModal();
            });
        }
        
        // Refresh chart button
        const refreshChartBtn = document.getElementById('refreshChartBtn');
        if (refreshChartBtn) {
            refreshChartBtn.addEventListener('click', () => {
                this.refreshChart();
            });
        }
        
        // Template modal events
        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('templateSettingsModal').classList.add('hidden');
                document.getElementById('customColorsModal').classList.add('hidden');
            });
        });
        
        const saveTemplateSettingsBtn = document.getElementById('saveTemplateSettings');
        if (saveTemplateSettingsBtn) {
            saveTemplateSettingsBtn.addEventListener('click', () => {
                this.saveTemplateSettings();
            });
        }
        
        // Custom colors modal events
        const addColorBtn = document.getElementById('addColorBtn');
        if (addColorBtn) {
            addColorBtn.addEventListener('click', () => {
                this.addColorInput();
            });
        }
        
        const colorPickerContainer = document.getElementById('colorPickerContainer');
        if (colorPickerContainer) {
            colorPickerContainer.addEventListener('click', (e) => {
                if (e.target.closest('.remove-color')) {
                    if (colorPickerContainer.querySelectorAll('.custom-color-input').length > 1) {
                        e.target.closest('.flex.items-center').remove();
                    }
                }
            });
            
            // Sync color input with hex input
            colorPickerContainer.addEventListener('input', (e) => {
                if (e.target.classList.contains('custom-color-input')) {
                    const hexInput = e.target.closest('.flex.items-center').querySelector('.color-hex-input');
                    if (hexInput) {
                        hexInput.value = e.target.value;
                    }
                } else if (e.target.classList.contains('color-hex-input')) {
                    const colorInput = e.target.closest('.flex.items-center').querySelector('.custom-color-input');
                    if (colorInput && this.isValidHexColor(e.target.value)) {
                        colorInput.value = e.target.value;
                    }
                }
            });
        }
        
        const applyCustomColorsBtn = document.getElementById('applyCustomColors');
        if (applyCustomColorsBtn) {
            applyCustomColorsBtn.addEventListener('click', () => {
                this.applyCustomColors();
            });
        }
        
        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const exportMenu = document.getElementById('exportMenu');
                exportMenu.classList.toggle('hidden');
            });
        }
        
        // Export options
        const exportOptions = document.querySelectorAll('.export-option');
        exportOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const type = e.target.closest('.export-option').dataset.type;
                this.exportChart(type);
                document.getElementById('exportMenu').classList.add('hidden');
            });
        });
        
        // Click outside to close dropdowns
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#exportBtn') && !e.target.closest('#exportMenu')) {
                const exportMenu = document.getElementById('exportMenu');
                if (exportMenu && !exportMenu.classList.contains('hidden')) {
                    exportMenu.classList.add('hidden');
                }
            }
        });
    },
    
    /**
     * Update the chart type
     * @param {string} type - Chart type
     */
    updateChartType(type) {
        if (!this.chart) return;
        
        // Save current data
        const data = this.chart.data;
        
        // Update type in config
        this.config.type = type;
        
        // Destroy current chart
        this.chart.destroy();
        
        // Adjust options based on chart type
        if (['pie', 'doughnut', 'polarArea'].includes(type)) {
            // Hide scales for pie/doughnut charts
            this.config.options.scales = {}; 
            
            // Use a single dataset for pie charts
            if (data.datasets.length > 1) {
                // Combine datasets for pie chart
                const combinedData = [];
                const combinedLabels = [];
                
                data.datasets.forEach((dataset, index) => {
                    dataset.data.forEach((value, i) => {
                        combinedData.push(value);
                        combinedLabels.push(`${dataset.label} - ${data.labels[i]}`);
                    });
                });
                
                data.datasets = [{
                    data: combinedData,
                    backgroundColor: this.getColorsForDataset(combinedData.length)
                }];
                
                data.labels = combinedLabels;
            }
        } else {
            // Restore scales for other chart types
            this.config.options.scales = {
                x: {
                    title: {
                        display: true,
                        text: document.getElementById('xAxisLabel').value || 'X Axis'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: document.getElementById('yAxisLabel').value || 'Y Axis'
                    },
                    beginAtZero: true
                }
            };
        }
        
        // Create new chart with updated type and preserved data
        this.config.data = data;
        this.chart = new Chart(document.getElementById('previewChart'), this.config);
    },
    
    /**
     * Update chart data based on selected data source
     * @param {string} source - Data source name
     */
    updateChartData(source) {
        if (!this.chart || !this.sampleData[source]) return;
        
        const data = this.sampleData[source];
        
        // Update chart type if necessary
        let recommendedType = 'bar';
        if (source === 'testResults') recommendedType = 'pie';
        if (source === 'executionTime') recommendedType = 'bar';
        if (source === 'testExecution') recommendedType = 'line';
        
        // Update the chart type dropdown
        const chartTypeSelect = document.getElementById('chartType');
        if (chartTypeSelect) {
            chartTypeSelect.value = recommendedType;
        }
        
        // Update axis labels
        let xAxisLabel = 'Date';
        let yAxisLabel = 'Count';
        
        if (source === 'executionTime') {
            xAxisLabel = 'Test Name';
            yAxisLabel = 'Duration (s)';
        } else if (source === 'testStability') {
            xAxisLabel = 'Test Name';
            yAxisLabel = 'Stability (%)';
        }
        
        const xAxisLabelInput = document.getElementById('xAxisLabel');
        const yAxisLabelInput = document.getElementById('yAxisLabel');
        
        if (xAxisLabelInput) xAxisLabelInput.value = xAxisLabel;
        if (yAxisLabelInput) yAxisLabelInput.value = yAxisLabel;
        
        // Update chart configuration
        this.config.type = recommendedType;
        this.config.data.labels = data.labels;
        
        // Update datasets with colors
        this.config.data.datasets = data.datasets.map((dataset, index) => {
            // If backgroundColor is a single color, convert to array for consistency
            let backgroundColor = Array.isArray(dataset.backgroundColor) 
                ? dataset.backgroundColor 
                : this.getColorsForDataset(dataset.data.length, index);
            
            return {
                ...dataset,
                backgroundColor,
                borderColor: backgroundColor,
                borderWidth: 1
            };
        });
        
        // Refresh the chart
        this.refreshChart();
        
        // Update data table
        this.updateDataTable();
    },
    
    /**
     * Update axis configuration
     */
    updateAxisConfiguration() {
        if (!this.chart) return;
        
        const xAxisValue = document.getElementById('xAxis').value;
        const yAxisValue = document.getElementById('yAxis').value;
        const xAxisLabel = document.getElementById('xAxisLabel').value;
        const yAxisLabel = document.getElementById('yAxisLabel').value;
        
        // Update axis labels
        if (this.config.options.scales.x) {
            this.config.options.scales.x.title = {
                display: true,
                text: xAxisLabel
            };
        }
        
        if (this.config.options.scales.y) {
            this.config.options.scales.y.title = {
                display: true,
                text: yAxisLabel
            };
        }
        
        // Update chart with selected variables
        if (xAxisValue && yAxisValue) {
            // This will be replaced with actual API data fetching in the full implementation
            console.log(`Updating chart with X: ${xAxisValue}, Y: ${yAxisValue}`);
        }
        
        this.refreshChart();
    },
    
    /**
     * Apply a color scheme to the chart
     * @param {string} schemeName - Name of the color scheme
     */
    applyColorScheme(schemeName) {
        if (!this.colorSchemes[schemeName]) return;
        
        const colors = this.colorSchemes[schemeName];
        
        // Update colors for all datasets
        this.config.data.datasets.forEach((dataset, datasetIndex) => {
            if (Array.isArray(dataset.data)) {
                if (['pie', 'doughnut', 'polarArea'].includes(this.config.type)) {
                    // For pie/doughnut charts, each data point gets its own color
                    dataset.backgroundColor = this.getColorsForDataset(dataset.data.length, 0, colors);
                    dataset.borderColor = dataset.backgroundColor;
                } else {
                    // For other chart types, each dataset gets its own color
                    const color = colors[datasetIndex % colors.length];
                    
                    if (this.config.type === 'line') {
                        // For line charts, use transparent fill
                        dataset.backgroundColor = this.hexToRgba(color, 0.2);
                        dataset.borderColor = color;
                    } else {
                        dataset.backgroundColor = color;
                        dataset.borderColor = color;
                    }
                }
            }
        });
    },
    
    /**
     * Get colors for a dataset
     * @param {number} count - Number of colors needed
     * @param {number} datasetIndex - Index of the dataset
     * @param {Array} colors - Optional custom colors array
     * @returns {Array} Array of colors
     */
    getColorsForDataset(count, datasetIndex = 0, colors = null) {
        if (!colors) {
            colors = this.colorSchemes.default;
        }
        
        const result = [];
        
        if (['pie', 'doughnut', 'polarArea'].includes(this.config.type)) {
            // For pie charts, each slice gets a different color
            for (let i = 0; i < count; i++) {
                result.push(colors[i % colors.length]);
            }
        } else {
            // For other charts, use a single color per dataset
            const color = colors[datasetIndex % colors.length];
            for (let i = 0; i < count; i++) {
                result.push(color);
            }
        }
        
        return result;
    },
    
    /**
     * Refresh the chart with current configuration
     */
    refreshChart() {
        if (!this.chart) return;
        
        // Apply current chart type
        const currentType = document.getElementById('chartType').value;
        if (this.config.type !== currentType) {
            this.updateChartType(currentType);
        } else {
            this.chart.update();
        }
    },
    
    /**
     * Update the data preview table
     */
    updateDataTable() {
        const table = document.getElementById('dataPreviewTable');
        if (!table || !this.chart) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Add data rows
        if (['pie', 'doughnut', 'polarArea'].includes(this.config.type)) {
            // For pie/doughnut charts, we show label and value pairs
            this.config.data.labels.forEach((label, index) => {
                const value = this.config.data.datasets[0].data[index];
                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">${label}</td>
                        <td class="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">${value}</td>
                    </tr>
                `;
            });
        } else {
            // For other charts, we show multiple datasets
            this.config.data.labels.forEach((label, index) => {
                const rowValues = this.config.data.datasets.map(dataset => dataset.data[index]);
                
                let row = `
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">${label}</td>
                        <td class="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                `;
                
                if (rowValues.length === 1) {
                    row += rowValues[0];
                } else {
                    row += '<div class="space-y-1">';
                    this.config.data.datasets.forEach((dataset, i) => {
                        row += `<div class="flex items-center">
                            <span class="w-3 h-3 mr-2 rounded-full" style="background-color: ${
                                Array.isArray(dataset.backgroundColor) ? 
                                dataset.backgroundColor[0] : dataset.backgroundColor
                            }"></span>
                            <span class="text-xs">${dataset.label}: ${rowValues[i]}</span>
                        </div>`;
                    });
                    row += '</div>';
                }
                
                row += `</td></tr>`;
                tbody.innerHTML += row;
            });
        }
    },
    
    /**
     * Apply advanced settings to the chart
     */
    applyAdvancedSettings() {
        // Get all settings from the form
        const aggregationMethod = document.getElementById('aggregationMethod').value;
        const decimalPlaces = parseInt(document.getElementById('decimalPlaces').value) || 2;
        
        // Get JSON configuration
        try {
            const jsonConfig = JSON.parse(document.getElementById('jsonConfig').value);
            
            // Apply JSON configuration (deep merge)
            this.config = this.deepMerge(this.config, jsonConfig);
        } catch (error) {
            console.error('Invalid JSON configuration:', error);
            // Show error message
            alert('Invalid JSON configuration. Please check the format.');
        }
        
        // Apply data formatting based on decimal places
        if (this.config.options.plugins.datalabels) {
            this.config.options.plugins.datalabels.formatter = (value) => {
                return typeof value === 'number' ? value.toFixed(decimalPlaces) : value;
            };
        }
        
        // Apply filters (in a real implementation, this would filter data from API)
        
        // Refresh chart
        this.refreshChart();
    },
    
    /**
     * Add a new filter row to the filter container
     */
    addFilterRow() {
        const filterContainer = document.getElementById('filterContainer');
        if (!filterContainer) return;
        
        const newFilter = document.createElement('div');
        newFilter.className = 'flex items-center space-x-2';
        newFilter.innerHTML = `
            <select class="filter-field w-1/3 bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-coral-500 focus:border-coral-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="status" data-i18n="status">Status</option>
                <option value="priority" data-i18n="priority">Priority</option>
                <option value="author" data-i18n="author">Author</option>
                <option value="testType" data-i18n="testType">Test Type</option>
            </select>
            <select class="filter-operator w-1/3 bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-coral-500 focus:border-coral-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="equals" data-i18n="equals">Equals</option>
                <option value="notEquals" data-i18n="notEquals">Not Equals</option>
                <option value="contains" data-i18n="contains">Contains</option>
                <option value="in" data-i18n="in">In</option>
            </select>
            <input type="text" class="filter-value w-1/3 bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-coral-500 focus:border-coral-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <button class="remove-filter p-1 text-red-500 hover:text-red-700">
                <i class="ri-close-line"></i>
            </button>
        `;
        
        filterContainer.appendChild(newFilter);
    },
    
    /**
     * Open the template settings modal
     */
    openTemplateSettingsModal() {
        const modal = document.getElementById('templateSettingsModal');
        if (!modal) return;
        
        // Get current template name if any
        const templateName = document.getElementById('templateName').value;
        
        // Set values in modal
        document.getElementById('modalTemplateName').value = templateName;
        document.getElementById('modalDescription').value = '';
        
        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },
    
    /**
     * Save template settings from modal
     */
    saveTemplateSettings() {
        const templateName = document.getElementById('modalTemplateName').value;
        const description = document.getElementById('modalDescription').value;
        const visibility = document.querySelector('input[name="visibility"]:checked').value;
        
        // Update template name in form
        document.getElementById('templateName').value = templateName;
        
        // Save template
        this.saveCurrentTemplate(templateName, description, visibility);
        
        // Close modal
        document.getElementById('templateSettingsModal').classList.add('hidden');
        document.getElementById('templateSettingsModal').classList.remove('flex');
    },
    
    /**
     * Open the custom color modal
     */
    openCustomColorModal() {
        const modal = document.getElementById('customColorsModal');
        if (!modal) return;
        
        // Reset color inputs to current custom colors
        const colorContainer = document.getElementById('colorPickerContainer');
        if (colorContainer) {
            // Clear existing color inputs (except the last one which is the button)
            const colorInputs = colorContainer.querySelectorAll('.flex.items-center');
            colorInputs.forEach(input => input.remove());
            
            // Add color inputs for current custom colors
            if (this.colorSchemes.custom.length > 0) {
                this.colorSchemes.custom.forEach(color => {
                    this.addColorInput(color);
                });
            } else {
                // Add default color input
                this.addColorInput('#4BC0C0');
            }
        }
        
        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },
    
    /**
     * Add a color input to the custom color modal
     * @param {string} color - Initial color value
     */
    addColorInput(color = '#4BC0C0') {
        const container = document.getElementById('colorPickerContainer');
        if (!container) return;
        
        const colorInput = document.createElement('div');
        colorInput.className = 'flex items-center space-x-2';
        colorInput.innerHTML = `
            <input type="color" class="custom-color-input h-8 w-10 border-0 rounded-md cursor-pointer" value="${color}">
            <input type="text" class="color-hex-input bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-coral-500 focus:border-coral-500 p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value="${color}">
            <button class="remove-color p-1 text-red-500 hover:text-red-700">
                <i class="ri-close-line"></i>
            </button>
        `;
        
        // Insert before the "Add Color" button
        const addColorBtn = document.getElementById('addColorBtn');
        container.insertBefore(colorInput, addColorBtn.parentNode);
    },
    
    /**
     * Apply custom colors from the modal
     */
    applyCustomColors() {
        const colorInputs = document.querySelectorAll('.custom-color-input');
        const colors = [];
        
        colorInputs.forEach(input => {
            colors.push(input.value);
        });
        
        // Save custom colors
        this.colorSchemes.custom = colors;
        
        // Apply custom colors to chart
        this.applyColorScheme('custom');
        this.refreshChart();
        
        // Close modal
        document.getElementById('customColorsModal').classList.add('hidden');
        document.getElementById('customColorsModal').classList.remove('flex');
    },
    
    /**
     * Save the current template
     * @param {string} name - Template name
     * @param {string} description - Template description
     * @param {string} visibility - Template visibility
     */
    saveCurrentTemplate(name = '', description = '', visibility = 'private') {
        // Get template name from form if not provided
        if (!name) {
            name = document.getElementById('templateName').value;
        }
        
        if (!name) {
            alert('Please enter a template name');
            return;
        }
        
        // Create template object
        const template = {
            id: Date.now(), // Generate unique ID
            name,
            description,
            visibility,
            config: JSON.parse(JSON.stringify(this.config)), // Deep clone config
            dataSource: document.getElementById('dataSource').value,
            timeRange: document.getElementById('timeRange').value
        };
        
        // Save to localStorage for demo
        // In a real app, this would be sent to the server
        const templates = JSON.parse(localStorage.getItem('chartTemplates') || '[]');
        templates.push(template);
        localStorage.setItem('chartTemplates', JSON.stringify(templates));
        
        // Add to UI
        this.addTemplateCard(template);
        
        alert('Template saved successfully');
    },
    
    /**
     * Load all templates from storage
     */
    loadTemplates() {
        // In a real app, this would fetch from the API
        const templates = JSON.parse(localStorage.getItem('chartTemplates') || '[]');
        
        // Clear container except for the "Add Template" card
        const container = document.getElementById('savedTemplatesContainer');
        if (container) {
            // Keep the first two templates and the add template card
            const existingCards = container.querySelectorAll('.template-card, .add-template-card');
            if (existingCards.length > 3) {
                for (let i = 3; i < existingCards.length; i++) {
                    existingCards[i].remove();
                }
            }
            
            // Add template cards
            templates.forEach(template => {
                this.addTemplateCard(template);
            });
        }
    },
    
    /**
     * Add a template card to the UI
     * @param {Object} template - Template object
     */
    addTemplateCard(template) {
        const container = document.getElementById('savedTemplatesContainer');
        if (!container) return;
        
        const card = document.createElement('div');
        card.className = 'template-card p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md cursor-pointer';
        card.dataset.id = template.id;
        
        // Determine icon based on chart type
        let icon = 'ri-bar-chart-line';
        if (template.config.type === 'line') icon = 'ri-line-chart-line';
        if (template.config.type === 'pie') icon = 'ri-pie-chart-line';
        if (template.config.type === 'doughnut') icon = 'ri-donut-chart-line';
        
        card.innerHTML = `
            <div class="h-32 bg-gray-100 dark:bg-gray-700 rounded mb-3 flex items-center justify-center">
                <i class="${icon} text-4xl text-gray-400 dark:text-gray-500"></i>
            </div>
            <h4 class="font-medium text-gray-800 dark:text-white">${template.name}</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${
                template.description || `${template.config.type} chart for ${template.dataSource}`
            }</p>
        `;
        
        // Add click handler
        card.addEventListener('click', () => {
            this.loadTemplateById(template.id);
        });
        
        // Insert before the "Add Template" card
        const addCard = container.querySelector('.add-template-card');
        container.insertBefore(card, addCard);
    },
    
    /**
     * Load a template by ID
     * @param {number} id - Template ID
     */
    loadTemplateById(id) {
        // In a real app, this would fetch from the API
        const templates = JSON.parse(localStorage.getItem('chartTemplates') || '[]');
        const template = templates.find(t => t.id === id);
        
        if (!template) {
            // For demo, load a sample template
            if (id === 1) {
                // Test Execution Trend template
                document.getElementById('templateName').value = 'Test Execution Trend';
                document.getElementById('chartType').value = 'line';
                document.getElementById('dataSource').value = 'testExecution';
                document.getElementById('timeRange').value = '7d';
                document.getElementById('xAxisLabel').value = 'Date';
                document.getElementById('yAxisLabel').value = 'Test Count';
                
                this.updateChartType('line');
                this.updateChartData('testExecution');
                this.applyColorScheme('default');
                this.refreshChart();
                
                return;
            }
            
            if (id === 2) {
                // Test Status Distribution template
                document.getElementById('templateName').value = 'Test Status Distribution';
                document.getElementById('chartType').value = 'pie';
                document.getElementById('dataSource').value = 'testResults';
                document.getElementById('timeRange').value = '30d';
                
                this.updateChartType('pie');
                this.updateChartData('testResults');
                this.applyColorScheme('vibrant');
                this.refreshChart();
                
                return;
            }
            
            alert('Template not found');
            return;
        }
        
        // Load template data
        document.getElementById('templateName').value = template.name;
        document.getElementById('dataSource').value = template.dataSource;
        document.getElementById('timeRange').value = template.timeRange;
        document.getElementById('chartType').value = template.config.type;
        
        // Apply settings from template
        this.config = JSON.parse(JSON.stringify(template.config)); // Deep clone
        
        // Update UI settings
        if (this.config.options.scales?.x?.title) {
            document.getElementById('xAxisLabel').value = this.config.options.scales.x.title.text;
        }
        
        if (this.config.options.scales?.y?.title) {
            document.getElementById('yAxisLabel').value = this.config.options.scales.y.title.text;
        }
        
        // Update checkboxes
        document.getElementById('showLegend').checked = 
            this.config.options.plugins.legend?.display !== false;
            
        document.getElementById('showDataLabels').checked = 
            this.config.options.plugins.datalabels?.display === true;
            
        document.getElementById('enableAnimation').checked = 
            this.config.options.animation?.duration !== 0;
        
        // Recreate chart
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(document.getElementById('previewChart'), this.config);
        
        // Update data table
        this.updateDataTable();
    },
    
    /**
     * Setup export options
     */
    setupExportOptions() {
        // Make sure the required libraries are loaded
        if (typeof jspdf === 'undefined' || typeof XLSX === 'undefined') {
            console.warn('Export libraries not loaded. PDF or Excel export may not work.');
        }
    },
    
    /**
     * Export the chart
     * @param {string} type - Export type (pdf, excel, image)
     */
    exportChart(type) {
        if (!this.chart) return;
        
        const chartCanvas = document.getElementById('previewChart');
        const templateName = document.getElementById('templateName').value || 'chart';
        const filename = templateName.replace(/\s+/g, '_').toLowerCase();
        
        switch (type) {
            case 'pdf':
                this.exportToPDF(chartCanvas, filename);
                break;
            case 'excel':
                this.exportToExcel(filename);
                break;
            case 'image':
                this.exportToImage(chartCanvas, filename);
                break;
        }
    },
    
    /**
     * Export chart to PDF
     * @param {HTMLElement} canvas - Chart canvas element
     * @param {string} filename - Output filename
     */
    exportToPDF(canvas, filename) {
        try {
            const { jsPDF } = window.jspdf;
            
            // Create PDF
            const pdf = new jsPDF('landscape');
            const title = document.getElementById('templateName').value || 'Chart';
            
            // Add title
            pdf.setFontSize(18);
            pdf.text(title, 14, 22);
            
            // Add chart image
            const imgData = canvas.toDataURL('image/png');
            // Calculate dimensions to fit on PDF
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth() - 28;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 14, 30, pdfWidth, pdfHeight);
            
            // Add data table
            pdf.setFontSize(12);
            pdf.text('Data Table', 14, pdfHeight + 40);
            
            // Add table data
            const tableData = this.getChartDataAsTable();
            if (tableData.length > 0) {
                pdf.autoTable({
                    startY: pdfHeight + 45,
                    head: [tableData[0]],
                    body: tableData.slice(1)
                });
            }
            
            // Add footer
            const date = new Date().toLocaleDateString();
            pdf.setFontSize(10);
            pdf.text(`Generated on ${date} with FlowTest Chart Designer`, 14, pdf.internal.pageSize.getHeight() - 10);
            
            // Save PDF
            pdf.save(`${filename}.pdf`);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('Error exporting to PDF. Make sure jsPDF library is loaded.');
        }
    },
    
    /**
     * Export chart data to Excel
     * @param {string} filename - Output filename
     */
    exportToExcel(filename) {
        try {
            // Get chart data as table
            const tableData = this.getChartDataAsTable();
            
            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(tableData);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Chart Data');
            
            // Save file
            XLSX.writeFile(wb, `${filename}.xlsx`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Error exporting to Excel. Make sure XLSX library is loaded.');
        }
    },
    
    /**
     * Export chart to image
     * @param {HTMLElement} canvas - Chart canvas element
     * @param {string} filename - Output filename
     */
    exportToImage(canvas, filename) {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    },
    
    /**
     * Get chart data as a table array
     * @returns {Array} 2D array of data
     */
    getChartDataAsTable() {
        if (!this.chart) return [];
        
        const result = [];
        const data = this.chart.data;
        
        if (['pie', 'doughnut', 'polarArea'].includes(this.config.type)) {
            // For pie charts
            result.push(['Label', 'Value']);
            
            data.labels.forEach((label, index) => {
                result.push([label, data.datasets[0].data[index]]);
            });
        } else {
            // For other charts
            // Header row with dataset names
            const header = ['Label'];
            data.datasets.forEach(dataset => {
                header.push(dataset.label || 'Dataset');
            });
            result.push(header);
            
            // Data rows
            data.labels.forEach((label, index) => {
                const row = [label];
                data.datasets.forEach(dataset => {
                    row.push(dataset.data[index]);
                });
                result.push(row);
            });
        }
        
        return result;
    },
    
    /* Utility functions */
    
    /**
     * Convert hex color to rgba
     * @param {string} hex - Hex color code
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} RGBA color string
     */
    hexToRgba(hex, alpha = 1) {
        let r = 0, g = 0, b = 0;
        
        // 3 digits
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } 
        // 6 digits
        else if (hex.length === 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
        }
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    
    /**
     * Check if a string is a valid hex color
     * @param {string} hex - Hex color string
     * @returns {boolean} True if valid
     */
    isValidHexColor(hex) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
    },
    
    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    deepMerge(target, source) {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }
        
        return output;
    },
    
    /**
     * Check if value is an object
     * @param {*} item - Value to check
     * @returns {boolean} True if object
     */
    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
};

// Initialize the designer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ChartDesigner.init();
});

// Make available globally
window.ChartDesigner = ChartDesigner;
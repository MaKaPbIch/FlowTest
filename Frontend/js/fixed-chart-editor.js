/**
 * Open chart editor modal for a specific chart with improved error handling
 * @param {string} chartId - ID of the chart to edit
 */
ReportManager.openChartEditor = function(chartId) {
    console.log('Opening chart editor for:', chartId);
    
    try {
        // Get modal elements
        const chartCustomizerModal = document.getElementById('chartCustomizerModal');
        const currentChartId = document.getElementById('currentChartId');
        
        if (!chartCustomizerModal || !currentChartId) {
            console.error('Chart customizer modal elements not found');
            if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                Alert.error('Ошибка: элементы модального окна редактора графиков не найдены');
            }
            return;
        }
        
        // Set current chart ID
        currentChartId.value = chartId;
        
        // Get chart container and chart instance
        const chartContainer = document.querySelector(`.chart-container[data-chart-id="${chartId}"]`);
        const chartCanvas = document.getElementById(chartId);
        
        if (!chartContainer || !chartCanvas) {
            console.error('Chart container or canvas not found');
            if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                Alert.error('Ошибка: контейнер или холст графика не найден');
            }
            return;
        }
        
        // Get chart instance from Chart.js with error handling
        let chartInstance = null;
        try {
            chartInstance = Chart.getChart(chartId);
        } catch (chartError) {
            console.error('Error getting chart instance:', chartError);
            if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                Alert.error('Ошибка при получении экземпляра графика');
            }
            return;
        }
        
        if (!chartInstance) {
            console.error('Chart instance not found');
            if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                Alert.error('Ошибка: экземпляр графика не найден');
            }
            return;
        }
        
        // Ensure required elements exist
        this.ensureChartEditorElements();
        
        // Populate form with current chart data (create a safe copy to avoid circular references)
        try {
            // Safely get chart type
            const chartType = chartInstance.config && chartInstance.config.type ? 
                chartInstance.config.type : 'bar';
                
            // Set chart type select
            const chartTypeSelect = document.getElementById('chartType');
            if (chartTypeSelect) {
                chartTypeSelect.value = chartType;
            }
            
            // Set chart title
            const chartTitleInput = document.getElementById('chartTitle');
            if (chartTitleInput) {
                let title = '';
                if (chartInstance.options && 
                    chartInstance.options.plugins && 
                    chartInstance.options.plugins.title) {
                    title = chartInstance.options.plugins.title.text || '';
                }
                chartTitleInput.value = title;
            }
            
            // Handle legend display checkbox
            const legendCheckbox = document.getElementById('chartLegend');
            if (legendCheckbox) {
                let showLegend = true;
                if (chartInstance.options && 
                    chartInstance.options.plugins && 
                    chartInstance.options.plugins.legend) {
                    showLegend = chartInstance.options.plugins.legend.display !== false;
                }
                legendCheckbox.checked = showLegend;
            }
            
            // Handle data labels checkbox
            const dataLabelsCheckbox = document.getElementById('chartDataLabels');
            if (dataLabelsCheckbox) {
                let showDataLabels = true;
                if (chartInstance.options && 
                    chartInstance.options.plugins && 
                    chartInstance.options.plugins.datalabels) {
                    showDataLabels = chartInstance.options.plugins.datalabels.display !== false;
                }
                dataLabelsCheckbox.checked = showDataLabels;
            }
            
            // Populate labels and datasets when in manual mode
            if (chartInstance.data && typeof chartInstance.customDataSource === 'undefined') {
                // Set data source to manual
                const dataSourceSelect = document.getElementById('chartDataSource');
                if (dataSourceSelect) {
                    dataSourceSelect.value = 'manual';
                    this.toggleDataSourceFields('manual');
                }
                
                // Set chart labels
                const chartLabelsInput = document.getElementById('chartLabels');
                if (chartLabelsInput && Array.isArray(chartInstance.data.labels)) {
                    chartLabelsInput.value = chartInstance.data.labels.join(', ');
                }
                
                // Clear existing datasets
                const datasetsContainer = document.getElementById('datasetsContainer');
                if (datasetsContainer) {
                    datasetsContainer.innerHTML = '';
                    
                    // Add dataset fields for each dataset
                    if (chartInstance.data.datasets && Array.isArray(chartInstance.data.datasets)) {
                        chartInstance.data.datasets.forEach(dataset => {
                            // Create new dataset item safely
                            // Use ChartCustomizer instead of 'this' for addDatasetField
                            if (window.ChartCustomizer && typeof ChartCustomizer.addDatasetField === 'function') {
                                ChartCustomizer.addDatasetField(
                                    dataset.label || '', 
                                    Array.isArray(dataset.data) ? dataset.data.join(', ') : '',
                                    dataset.borderColor || '#3b82f6'
                                );
                            } else {
                                console.error('ChartCustomizer.addDatasetField is not available');
                            }
                        });
                    }
                }
            } else if (chartInstance.customDataSource) {
                // Handle variable-based data source
                const dataSourceSelect = document.getElementById('chartDataSource');
                const dataVariableSelect = document.getElementById('dataVariable');
                
                if (dataSourceSelect && dataVariableSelect && chartInstance.customDataSource.type) {
                    dataSourceSelect.value = chartInstance.customDataSource.type;
                    this.toggleDataSourceFields(chartInstance.customDataSource.type);
                    
                    if (chartInstance.customDataSource.variable) {
                        dataVariableSelect.value = chartInstance.customDataSource.variable;
                    }
                    
                    // Set time period if available
                    const timePeriodSelect = document.getElementById('timePeriod');
                    if (timePeriodSelect && chartInstance.customDataSource.timePeriod) {
                        timePeriodSelect.value = chartInstance.customDataSource.timePeriod;
                        
                        if (chartInstance.customDataSource.timePeriod === 'custom') {
                            const customTimePeriod = document.getElementById('customTimePeriod');
                            if (customTimePeriod) {
                                customTimePeriod.classList.remove('hidden');
                            }
                        }
                    }
                }
            }
        } catch (populateError) {
            console.error('Error populating chart editor form:', populateError);
        }
        
        // Set up event handlers
        const dataSourceSelect = document.getElementById('chartDataSource');
        const timePeriodSelect = document.getElementById('timePeriod');
        const addFilterBtn = document.getElementById('addFilterBtn');
        
        // Set up data source change handler
        if (dataSourceSelect) {
            // Remove existing handler to prevent memory leaks
            dataSourceSelect.removeEventListener('change', this._dataSourceChangeHandler);
            
            // Create a new handler function
            this._dataSourceChangeHandler = (e) => {
                try {
                    this.toggleDataSourceFields(e.target.value);
                } catch (error) {
                    console.error('Error in data source change handler:', error);
                }
            };
            
            // Attach the handler
            dataSourceSelect.addEventListener('change', this._dataSourceChangeHandler);
        }
        
        // Set up time period change handler
        if (timePeriodSelect) {
            // Remove existing handler to prevent memory leaks
            timePeriodSelect.removeEventListener('change', this._timePeriodChangeHandler);
            
            // Create a new handler function
            this._timePeriodChangeHandler = (e) => {
                try {
                    const customTimePeriod = document.getElementById('customTimePeriod');
                    if (customTimePeriod) {
                        customTimePeriod.classList.toggle('hidden', e.target.value !== 'custom');
                    }
                } catch (error) {
                    console.error('Error in time period change handler:', error);
                }
            };
            
            // Attach the handler
            timePeriodSelect.addEventListener('change', this._timePeriodChangeHandler);
            
            // Trigger change handler if current value is 'custom'
            if (timePeriodSelect.value === 'custom') {
                timePeriodSelect.dispatchEvent(new Event('change'));
            }
        }
        
        // Set up add filter button
        if (addFilterBtn) {
            // Remove existing handler to prevent memory leaks
            addFilterBtn.removeEventListener('click', this._addFilterHandler);
            
            // Create a new handler function
            this._addFilterHandler = () => {
                try {
                    this.addFilterRow();
                } catch (error) {
                    console.error('Error in add filter handler:', error);
                }
            };
            
            // Attach the handler
            addFilterBtn.addEventListener('click', this._addFilterHandler);
        }
        
        // Show modal
        chartCustomizerModal.classList.remove('hidden');
        chartCustomizerModal.classList.add('flex');
        
    } catch (error) {
        console.error('Error opening chart editor:', error);
        if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
            Alert.error('Произошла ошибка при открытии редактора графика');
        }
    }
};

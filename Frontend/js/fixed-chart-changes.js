/**
 * Apply changes to chart from editor with improved error handling and circular reference prevention
 */
ReportManager.applyChartChanges = function() {
    try {
        // Basic error handling for DOM elements
        const currentChartIdEl = document.getElementById('currentChartId');
        if (!currentChartIdEl) {
            console.error('Chart ID element not found');
            if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                Alert.error('Ошибка: Элемент ID графика не найден');
            }
            return;
        }
        
        const chartId = currentChartIdEl.value;
        if (!chartId) {
            console.error('Chart ID is empty');
            if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                Alert.error('Ошибка: ID графика не указан');
            }
            return;
        }
        
        // Get form elements with error handling
        const chartTypeEl = document.getElementById('chartType');
        const chartTitleEl = document.getElementById('chartTitle');
        const dataSourceEl = document.getElementById('chartDataSource');
        
        if (!chartTypeEl || !chartTitleEl || !dataSourceEl) {
            console.error('Required chart customizer elements not found');
            if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                Alert.error('Ошибка: Необходимые элементы формы не найдены');
            }
            return;
        }
        
        const chartType = chartTypeEl.value;
        const chartTitle = chartTitleEl.value;
        const dataSource = dataSourceEl.value;
        
        // Safely get chart instance
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
            console.error('Chart not found:', chartId);
            if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                Alert.error('Ошибка: График не найден');
            }
            return;
        }
        
        // Create a clone of the options to avoid circular references
        const safeOptions = {};
        
        // Copy existing options safely
        if (chartInstance.options) {
            // Only copy properties we need
            safeOptions.responsive = chartInstance.options.responsive !== undefined ? 
                chartInstance.options.responsive : true;
            safeOptions.maintainAspectRatio = chartInstance.options.maintainAspectRatio !== undefined ? 
                chartInstance.options.maintainAspectRatio : true;
            
            // Create plugins object safely
            safeOptions.plugins = {};
            
            // Title options
            safeOptions.plugins.title = {
                display: !!chartTitle,
                text: chartTitle
            };
            
            // Legend options
            const showLegendEl = document.getElementById('chartLegend');
            safeOptions.plugins.legend = {
                display: showLegendEl ? showLegendEl.checked : true
            };
            
            // Data labels options
            const showDataLabelsEl = document.getElementById('chartDataLabels');
            safeOptions.plugins.datalabels = {
                display: showDataLabelsEl ? showDataLabelsEl.checked : true
            };
        }
        
        // Assign the safe options object
        chartInstance.options = safeOptions;
        
        // Process data based on source
        if (dataSource === 'manual') {
            // Process manual data
            const chartLabelsEl = document.getElementById('chartLabels');
            if (!chartLabelsEl) {
                console.error('Chart labels element not found');
                if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                    Alert.error('Ошибка: Элемент меток графика не найден');
                }
                return;
            }
            
            const labelString = chartLabelsEl.value;
            const labels = labelString.split(',').map(label => label.trim());
            
            // Create a fresh datasets array to avoid reference issues
            const newDatasets = [];
            
            // Get all dataset containers
            const datasetElements = document.querySelectorAll('.dataset-item');
            
            if (datasetElements.length === 0) {
                console.warn('No dataset elements found, creating default dataset');
                // Create a default dataset
                const defaultDataset = {
                    label: 'Данные',
                    data: Array(labels.length).fill(0)
                };
                
                if (chartType === 'pie' || chartType === 'doughnut') {
                    defaultDataset.backgroundColor = ReportManager.generateColors 
                        ? ReportManager.generateColors(labels.length) 
                        : ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
                } else {
                    defaultDataset.backgroundColor = 'rgba(54, 162, 235, 0.2)';
                    defaultDataset.borderColor = '#36A2EB';
                }
                
                newDatasets.push(defaultDataset);
            } else {
                // Process each dataset element
                datasetElements.forEach(element => {
                    const labelEl = element.querySelector('.dataset-label');
                    const dataStringEl = element.querySelector('.dataset-data');
                    const colorEl = element.querySelector('.dataset-color');
                    
                    if (!labelEl || !dataStringEl || !colorEl) {
                        console.error('Dataset form elements not found in item');
                        return;
                    }
                    
                    const label = labelEl.value;
                    const dataString = dataStringEl.value;
                    const color = colorEl.value;
                    
                    // Safely parse data
                    const data = [];
                    if (dataString) {
                        const values = dataString.split(',');
                        for (let i = 0; i < values.length; i++) {
                            const parsed = parseFloat(values[i].trim());
                            data.push(isNaN(parsed) ? 0 : parsed);
                        }
                    }
                    
                    // Create dataset object based on chart type
                    const dataset = {
                        label: label,
                        data: data
                    };
                    
                    if (chartType === 'pie' || chartType === 'doughnut') {
                        // For pie/doughnut charts, create an array of colors
                        dataset.backgroundColor = ReportManager.generateColors 
                            ? ReportManager.generateColors(data.length) 
                            : ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
                    } else {
                        // For other charts, use the selected color
                        dataset.backgroundColor = ReportManager.adjustColorOpacity 
                            ? ReportManager.adjustColorOpacity(color, 0.2) 
                            : 'rgba(54, 162, 235, 0.2)';
                        dataset.borderColor = color;
                    }
                    
                    newDatasets.push(dataset);
                });
            }
            
            // Update chart data with new arrays to avoid reference issues
            chartInstance.data = {
                labels: labels,
                datasets: newDatasets
            };
        } else {
            // Process data from system variables - use a safer approach
            try {
                const variableEl = document.getElementById('dataVariable');
                const timePeriodEl = document.getElementById('timePeriod');
                
                if (!variableEl || !timePeriodEl) {
                    console.error('Data variable or time period elements not found');
                    if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                        Alert.error('Ошибка: Элементы выбора данных не найдены');
                    }
                    return;
                }
                
                const variable = variableEl.value;
                const timePeriod = timePeriodEl.value;
                
                // Instead of setting the chart data directly in the callback,
                // use a separate function to update the chart with the fetched data
                if (typeof ReportManager.fetchChartData === 'function') {
                    console.log('Calling fetchChartData for', variable, timePeriod);
                    
                    // Get current project ID to log it for debugging
                    const projectId = ReportManager.currentProjectId;
                    console.log('Current project ID:', projectId);
                    
                    // Notify user that we're trying to get real data
                    if (typeof Alert !== 'undefined' && typeof Alert.info === 'function') {
                        Alert.info('Загрузка актуальных данных...');
                    }
                    
                    ReportManager.fetchChartData(variable, timePeriod)
                        .then(data => {
                            console.log('Chart data received:', data);
                            
                            if (!data || typeof data !== 'object') {
                                console.error('Invalid chart data received');
                                
                                // If data is null or invalid, show empty chart with error message
                                console.error('Invalid data received from API');
                                Alert.error('Получены некорректные данные. Проверьте подключение к API.');
                                
                                // Create empty data with error message
                                data = {
                                    labels: [],
                                    datasets: [],
                                    error: true,
                                    message: 'Нет данных'
                                };
                                
                                return;
                            }
                            
                            // Safely update chart with new arrays
                            chartInstance.data.labels = Array.isArray(data.labels) ? [...data.labels] : [];
                            
                            // Process datasets to avoid reference issues
                            if (Array.isArray(data.datasets)) {
                                const cleanDatasets = data.datasets.map(ds => {
                                    // Create a clean dataset object with only needed properties
                                    const cleanDs = {
                                        label: ds.label || 'Данные',
                                        data: Array.isArray(ds.data) ? [...ds.data] : []
                                    };
                                    
                                    // Copy color properties
                                    if (ds.backgroundColor) cleanDs.backgroundColor = ds.backgroundColor;
                                    if (ds.borderColor) cleanDs.borderColor = ds.borderColor;
                                    
                                    return cleanDs;
                                });
                                
                                chartInstance.data.datasets = cleanDatasets;
                            } else {
                                console.warn('No datasets in chart data');
                                chartInstance.data.datasets = [];
                            }
                            
                            // Update chart type if the data specifies a different type
                            if (data.type && chartType !== data.type) {
                                console.log(`Changing chart type from ${chartType} to ${data.type}`);
                                chartInstance.config.type = data.type;
                            }
                            
                            // Show error message if there was an error
                            if (data.error) {
                                console.warn('Error data for chart');
                                
                                // Add error message to chart
                                if (!chartInstance.options.plugins.title) {
                                    chartInstance.options.plugins.title = {};
                                }
                                
                                chartInstance.options.plugins.title.display = true;
                                chartInstance.options.plugins.title.text = data.message || 'Нет данных';
                                chartInstance.options.plugins.title.position = 'center';
                                chartInstance.options.plugins.title.font = {
                                    style: 'normal',
                                    weight: 'bold',
                                    size: 16
                                };
                                chartInstance.options.plugins.title.color = '#EF4444';
                                
                                // Clear any existing datasets
                                chartInstance.data.datasets = [];
                            }
                            
                            // Update the chart with the new safe data
                            try {
                                chartInstance.update();
                                console.log('Chart updated successfully');
                            } catch (updateError) {
                                console.error('Error updating chart with fetched data:', updateError);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching chart data:', error);
                            if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                                Alert.error('Ошибка при получении данных для графика');
                            }
                        });
                }
            } catch (dataError) {
                console.error('Error processing chart data source:', dataError);
            }
        }
        
        // Update chart type if changed
        if (chartInstance.config.type !== chartType) {
            chartInstance.config.type = chartType;
        }
        
        // Update the chart with error handling
        try {
            chartInstance.update();
        } catch (updateError) {
            console.error('Error updating chart:', updateError);
            if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
                Alert.error('Ошибка при обновлении графика');
            }
        }
        
        // Hide the modal
        const modal = document.getElementById('chartCustomizerModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        
        // Показываем сообщение об успехе
        if (typeof Alert !== 'undefined' && typeof Alert.success === 'function') {
            Alert.success('Изменения применены');
        } else {
            console.log('Изменения применены');
        }
    } catch (error) {
        // Catch any unexpected errors
        console.error('Unexpected error in applyChartChanges:', error);
        if (typeof Alert !== 'undefined' && typeof Alert.error === 'function') {
            Alert.error('Произошла неожиданная ошибка при настройке графика');
        }
    }
};

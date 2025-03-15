const ChartCustomizer = {
    // Доступные типы графиков
    chartTypes: {
        line: {
            name: 'Line Chart',
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        },
        bar: {
            name: 'Bar Chart',
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        },
        pie: {
            name: 'Pie Chart',
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        },
        doughnut: {
            name: 'Doughnut Chart',
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        },
        radar: {
            name: 'Radar Chart',
            options: {
                elements: {
                    line: {
                        borderWidth: 3
                    }
                }
            }
        }
    },

    // Доступные источники данных
    dataSources: {
        manual: 'Ручной ввод',
        test_results: 'Результаты тестов',
        test_statuses: 'Статусы тестов',
        test_runs: 'Запуски тестов'
    },

    // Переменные для каждого источника данных
    dataVariables: {
        test_results: [
            { value: 'pass_fail_ratio', label: 'Соотношение прошедших/проваленных тестов' },
            { value: 'test_duration', label: 'Продолжительность выполнения тестов' },
            { value: 'test_count_by_day', label: 'Количество тестов по дням' },
            { value: 'success_rate_trend', label: 'Тренд успешности тестов' },
            { value: 'failure_by_component', label: 'Проваленные тесты по компонентам' }
        ],
        test_statuses: [
            { value: 'test_status_distribution', label: 'Распределение статусов тестов' },
            { value: 'status_changes_over_time', label: 'Изменение статусов по времени' },
            { value: 'status_by_priority', label: 'Статусы по приоритетам' },
            { value: 'status_by_component', label: 'Статусы по компонентам' }
        ],
        test_runs: [
            { value: 'runs_by_user', label: 'Запуски по пользователям' },
            { value: 'runs_by_day', label: 'Запуски по дням' },
            { value: 'average_run_duration', label: 'Средняя продолжительность запуска' },
            { value: 'run_success_ratio', label: 'Соотношение успешных запусков' }
        ]
    },

    // Текущая конфигурация для каждого графика
    chartConfigs: {},

    // Инициализация кастомизатора для графика
    initCustomizer(chartId) {
        const container = document.createElement('div');
        container.className = 'chart-customizer bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4';
        
        container.innerHTML = `
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Chart Type</label>
                <select class="chart-type-select mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    ${Object.entries(this.chartTypes).map(([type, config]) => 
                        `<option value="${type}">${config.name}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Options</label>
                <div class="space-y-2 mt-2">
                    <label class="flex items-center">
                        <input type="checkbox" class="show-legend mr-2" checked>
                        <span class="text-sm text-gray-700 dark:text-gray-300">Show Legend</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="show-grid mr-2" checked>
                        <span class="text-sm text-gray-700 dark:text-gray-300">Show Grid</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="enable-animation mr-2" checked>
                        <span class="text-sm text-gray-700 dark:text-gray-300">Enable Animation</span>
                    </label>
                </div>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Colors</label>
                <div class="color-picker flex flex-wrap gap-2 mt-2">
                    ${this.getDefaultColors().map(color => `
                        <button class="w-6 h-6 rounded-full" style="background-color: ${color}" data-color="${color}"></button>
                    `).join('')}
                </div>
            </div>
            <div class="flex justify-end space-x-2">
                <button class="save-config px-4 py-2 bg-coral-500 text-white rounded-md hover:bg-coral-600">
                    Save Configuration
                </button>
            </div>
        `;

        // Добавляем обработчики событий
        const typeSelect = container.querySelector('.chart-type-select');
        const saveButton = container.querySelector('.save-config');
        const colorButtons = container.querySelectorAll('.color-picker button');

        typeSelect.addEventListener('change', () => this.updateChartType(chartId, typeSelect.value));
        saveButton.addEventListener('click', () => this.saveConfiguration(chartId, container));
        colorButtons.forEach(button => {
            button.addEventListener('click', () => this.updateChartColor(chartId, button.dataset.color));
        });

        // Сохраняем начальную конфигурацию
        this.chartConfigs[chartId] = {
            type: typeSelect.value,
            options: this.getOptionsFromContainer(container)
        };

        return container;
    },

    // Получение опций из контейнера
    getOptionsFromContainer(container) {
        return {
            plugins: {
                legend: {
                    display: container.querySelector('.show-legend').checked
                }
            },
            scales: {
                x: {
                    grid: {
                        display: container.querySelector('.show-grid').checked
                    }
                },
                y: {
                    grid: {
                        display: container.querySelector('.show-grid').checked
                    }
                }
            },
            animation: {
                duration: container.querySelector('.enable-animation').checked ? 1000 : 0
            }
        };
    },

    // Обновление типа графика
    updateChartType(chartId, newType) {
        if (!this.chartConfigs[chartId]) return;
        
        this.chartConfigs[chartId].type = newType;
        const chart = ReportsManager?.charts?.[chartId];
        if (chart) {
            const data = chart.data;
            chart.destroy();
            ReportsManager.charts[chartId] = new Chart(
                document.getElementById(chartId),
                {
                    type: newType,
                    data: data,
                    options: { ...this.chartTypes[newType].options, ...this.chartConfigs[chartId].options }
                }
            );
        }
    },

    // Обновление цвета графика
    updateChartColor(chartId, color) {
        const chart = ReportsManager?.charts?.[chartId];
        if (chart) {
            chart.data.datasets.forEach(dataset => {
                if (chart.config.type === 'pie' || chart.config.type === 'doughnut') {
                    dataset.backgroundColor = dataset.data.map(() => color);
                } else {
                    dataset.backgroundColor = color;
                    dataset.borderColor = color;
                }
            });
            chart.update();
        }
    },

    // Сохранение конфигурации
    saveConfiguration(chartId, container) {
        const config = {
            type: container.querySelector('.chart-type-select').value,
            options: this.getOptionsFromContainer(container)
        };

        // Сохраняем конфигурацию
        this.chartConfigs[chartId] = config;

        // Обновляем график
        const chart = ReportsManager?.charts?.[chartId];
        if (chart) {
            chart.destroy();
            ReportsManager.charts[chartId] = new Chart(
                document.getElementById(chartId),
                {
                    type: config.type,
                    data: chart.data,
                    options: { ...this.chartTypes[config.type].options, ...config.options }
                }
            );
        }

        // Показываем уведомление
        if (typeof showToast === 'function') {
            showToast('Configuration saved successfully', 'success');
        } else {
            console.log('Configuration saved successfully');
        }
    },

    // Экспорт конфигурации
    exportConfiguration(chartId) {
        return this.chartConfigs[chartId];
    },

    // Импорт конфигурации
    importConfiguration(chartId, config) {
        this.chartConfigs[chartId] = config;
        this.updateChartType(chartId, config.type);
    },

    // Получение стандартных цветов
    getDefaultColors() {
        return [
            '#3B82F6', // blue
            '#10B981', // green
            '#F59E0B', // amber
            '#EF4444', // red
            '#8B5CF6', // purple
            '#EC4899', // pink
            '#06B6D4', // cyan
            '#F97316', // orange
            '#6366F1'  // indigo
        ];
    },

    // Переключение полей в зависимости от источника данных
    toggleDataSourceFields(source) {
        console.log('Toggling data source fields for:', source);
        
        const manualContainer = document.getElementById('manualDataContainer');
        const variableContainer = document.getElementById('variableSelectionContainer');
        const timePeriodContainer = document.getElementById('timePeriodContainer');
        
        if (!manualContainer || !variableContainer || !timePeriodContainer) {
            console.error('Data source containers not found:', {
                manualContainer: !!manualContainer,
                variableContainer: !!variableContainer,
                timePeriodContainer: !!timePeriodContainer
            });
            return;
        }
        
        if (source === 'manual') {
            manualContainer.classList.remove('hidden');
            variableContainer.classList.add('hidden');
            timePeriodContainer.classList.add('hidden');
        } else {
            manualContainer.classList.add('hidden');
            variableContainer.classList.remove('hidden');
            timePeriodContainer.classList.remove('hidden');
            
            // Populate variables based on selected source
            this.populateVariables(source);
        }
    },

    // Заполнение списка переменных
    populateVariables(source) {
        const variableSelect = document.getElementById('dataVariable');
        if (!variableSelect) {
            console.error('Variable select element not found');
            return;
        }
        
        // Очищаем текущие опции
        variableSelect.innerHTML = '';
        
        // Добавляем переменные в зависимости от источника данных
        if (this.dataVariables[source]) {
            this.dataVariables[source].forEach(variable => {
                const option = document.createElement('option');
                option.value = variable.value;
                option.textContent = variable.label;
                variableSelect.appendChild(option);
            });
        } else {
            // Если нет переменных для выбранного источника
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Нет доступных переменных';
            variableSelect.appendChild(option);
        }
    },

    // Добавление поля для набора данных
    addDatasetField(label = '', data = '', color = '') {
        const datasetsContainer = document.getElementById('datasetsContainer');
        if (!datasetsContainer) {
            console.error('Datasets container not found');
            return;
        }
        
        const datasetIndex = datasetsContainer.children.length;
        
        // Если цвет не указан, используем цвет по умолчанию из набора
        if (!color) {
            color = this.getDefaultColors()[datasetIndex % this.getDefaultColors().length];
        }
        
        // Если метка не указана, используем "Серия X"
        if (!label) {
            label = `Серия ${datasetIndex + 1}`;
        }
        
        const datasetItem = document.createElement('div');
        datasetItem.className = 'dataset-item p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2 border border-gray-200 dark:border-gray-600';
        datasetItem.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h5 class="font-medium text-sm">Набор данных ${datasetIndex + 1}</h5>
                <button type="button" class="remove-dataset-btn text-red-500 hover:text-red-700">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
            <div class="mb-2">
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">Название</label>
                <input type="text" class="dataset-label w-full bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded focus:ring-coral-500 focus:border-coral-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value="${label}">
            </div>
            <div class="mb-2">
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">Данные (через запятую)</label>
                <input type="text" class="dataset-data w-full bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded focus:ring-coral-500 focus:border-coral-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="10, 20, 30, 40" value="${data}">
            </div>
            <div class="mb-2">
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">Цвет</label>
                <div class="flex items-center">
                    <input type="color" class="dataset-color w-8 h-8 p-0 border-0" value="${color}">
                    <input type="text" class="dataset-color-text ml-2 w-32 bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded focus:ring-coral-500 focus:border-coral-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value="${color}">
                </div>
            </div>
        `;
        
        // Добавляем обработчик события для кнопки удаления
        const removeBtn = datasetItem.querySelector('.remove-dataset-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                datasetItem.remove();
            });
        }
        
        // Синхронизация цветных инпутов
        const colorInput = datasetItem.querySelector('.dataset-color');
        const colorTextInput = datasetItem.querySelector('.dataset-color-text');
        
        if (colorInput && colorTextInput) {
            colorInput.addEventListener('input', () => {
                colorTextInput.value = colorInput.value;
            });
            
            colorTextInput.addEventListener('input', () => {
                if (/^#[0-9A-F]{6}$/i.test(colorTextInput.value)) {
                    colorInput.value = colorTextInput.value;
                }
            });
        }
        
        datasetsContainer.appendChild(datasetItem);
    }
};

// Добавляем в глобальную область видимости
window.ChartCustomizer = ChartCustomizer;

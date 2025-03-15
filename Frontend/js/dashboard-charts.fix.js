// Dashboard Charts

// Функция для обновления статистики дашборда
function updateDashboardStats(data) {
    console.log('Updating dashboard stats with data:', data);
    
    const totalTestsElement = document.getElementById('totalTests');
    const successRateElement = document.getElementById('successRate');
    const avgExecutionTimeElement = document.getElementById('avgExecutionTime');

    // Устанавливаем значение для общего количества тестов
    if (totalTestsElement) {
        if (data && data.total_tests) {
            totalTestsElement.textContent = data.total_tests;
        } else {
            totalTestsElement.textContent = '-';
        }
    }

    // Устанавливаем значение для успешности выполнения тестов
    if (successRateElement) {
        if (data && data.status_distribution) {
            const { passed, failed, error, skipped } = data.status_distribution;
            const total = passed + failed + error + skipped;
            const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
            successRateElement.textContent = `${successRate}%`;
        } else {
            successRateElement.textContent = '-';
        }
    }

    // Устанавливаем значение для среднего времени выполнения
    if (avgExecutionTimeElement) {
        // Проверяем разные поля, которые могут прийти с бэкенда
        if (data && (data.avg_duration || data.average_time || data.execution_time || data.duration)) {
            const duration = data.avg_duration || data.average_time || data.execution_time || data.duration;
            avgExecutionTimeElement.textContent = formatDuration(duration);
        } else {
            avgExecutionTimeElement.textContent = '-';
        }
    }
}

// Define the fetchData function right away to make it available globally
async function fetchData(projectId) {
    if (!projectId) {
        console.log('No project selected, skipping data fetch');
        // Очищаем все графики и статистику
        updateDashboardStats(null);
        return;
    }

    try {
        console.log('Fetching data for project:', projectId);

        const urls = [
            `${config.API_BASE_URL}${config.API_PREFIX}${config.ENDPOINTS.REPORTS.ANALYTICS}tests-over-time/?project_id=${projectId}`,
            `${config.API_BASE_URL}${config.API_PREFIX}${config.ENDPOINTS.REPORTS.ANALYTICS}results-distribution/?project_id=${projectId}`,
            `${config.API_BASE_URL}${config.API_PREFIX}${config.ENDPOINTS.REPORTS.ANALYTICS}priority-distribution/?project_id=${projectId}`,
            `${config.API_BASE_URL}${config.API_PREFIX}${config.ENDPOINTS.REPORTS.ANALYTICS}test-cases-creation/?project_id=${projectId}`,
            `${config.API_BASE_URL}${config.API_PREFIX}${config.ENDPOINTS.REPORTS.ANALYTICS}test-flakiness/?project_id=${projectId}`,
            `${config.API_BASE_URL}${config.API_PREFIX}${config.ENDPOINTS.PROJECTS}${projectId}/folders_and_test_cases/`,
            `${config.API_BASE_URL}${config.API_PREFIX}${config.ENDPOINTS.REPORTS.ANALYTICS}test-execution/?project_id=${projectId}`,
            `${config.API_BASE_URL}${config.API_PREFIX}${config.ENDPOINTS.REPORTS.ANALYTICS}top-contributors/?project_id=${projectId}`
        ];

        // Загружаем данные для всех графиков
        const responses = await Promise.all(
            urls.map(url => 
                fetchWithAuth(url)
                .then(response => {
                    // Добавляем логирование для отладки проблемы с Top Contributors
                    if (url.includes('top-contributors')) {
                        console.log(`Top Contributors API response status: ${response.status}`);
                    }
                    
                    if (!response.ok) {
                        console.log(`Ошибка при загрузке данных: ${url} вернул статус ${response.status}`);
                        // Вместо исключения возвращаем пустой массив или объект
                        return { json: () => Promise.resolve(url.includes('test-execution') ? { 
                            total_tests: 0, 
                            total_executions: 0, 
                            status_distribution: { 
                                passed: 0, 
                                failed: 0, 
                                error: 0, 
                                skipped: 0 
                            } 
                        } : []) };
                    }
                    return response;
                })
            )
        );

        const dataPromises = responses.map(response => {
            try {
                return response.json();
            } catch (error) {
                console.log('Error parsing response:', error);
                return [];
            }
        });

        let [
            testsOverTime,
            resultsDistribution,
            priorityDistribution,
            testCasesCreation,
            testFlakiness,
            foldersAndTests,
            testExecution,
            topContributors
        ] = await Promise.all(dataPromises);

        // Логируем ответы для отладки
        responses.forEach((response, index) => {
            if (response.ok) {
                console.log(`Response from ${urls[index]} :`, dataPromises[index]);
            }
        });

        // Преобразуем данные статистики выполнения тестов
        let testExecutionData = testExecution || { 
            total_tests: 0, 
            total_executions: 0, 
            status_distribution: { 
                passed: 0, 
                failed: 0, 
                error: 0, 
                skipped: 0 
            } 
        };

        // Отладка топ контрибьюторов
        console.log('Raw top contributors data:', topContributors);
        
        // Проверка на пустые данные 
        if (!topContributors || (Array.isArray(topContributors) && topContributors.length === 0)) {
            console.warn('No top contributors data available from API');
            
            // Добавляем текущего пользователя вручную для временного решения
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                try {
                    const userData = JSON.parse(currentUser);
                    console.log('Adding current user to contributors:', userData);
                    topContributors = [{
                        author: userData.username || 'Current User',
                        count: 1 // Показываем минимум 1 тест
                    }];
                } catch (e) {
                    console.error('Error parsing current user data:', e);
                }
            }
        }
        
        // Сохраняем данные для переключения языка
        lastChartData = {
            testsOverTime: testsOverTime || { labels: [], success_rate: [] },
            resultsDistribution: resultsDistribution || [],
            priorityDistribution: priorityDistribution || [],
            testCasesCreation: testCasesCreation || [],
            testExecution: testExecutionData,
            testFlakiness: testFlakiness || [],
            foldersAndTests: foldersAndTests || [],
            topContributors: topContributors || []
        };

        // Обновляем графики и статистику
        createSuccessRateChart(testExecutionData);
        updateDashboardStats(testExecutionData);
        updateAuthorStats(topContributors);
        createResultsChart(resultsDistribution);
        createPriorityChart(priorityDistribution);
        createCreationActivityChart(testCasesCreation);
        createFlakinessChart(testFlakiness);

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
        // Instead of trying to create charts with empty data, just update stats
        // This will avoid problems with chart initialization
        updateDashboardStats(null);
        
        // Only attempt to create charts if Chart.js is available
        if (typeof Chart !== 'undefined') {
            try {
                createSuccessRateChart({ labels: [], success_rate: [] });
                createResultsChart([]);
                createPriorityChart([]);
                createCreationActivityChart([]);
            } catch (chartError) {
                console.error('Error creating empty charts:', chartError);
            }
        }
        
        // These don't depend on Chart.js
        createFlakinessChart([]);
        updateAuthorStats([]);
    }
}

// Make the function globally available immediately
window.fetchData = fetchData;

// Chart colors
const chartColors = {
    success: '#10B981',
    error: '#EF4444',
    danger: '#EF4444', // Red color for failed tests
    warning: '#F59E0B',
    info: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899'
};

// Utility functions
const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
};

const formatDuration = (duration) => {
    // Если продолжительность уже в виде отформатированной строки, возвращаем её
    if (typeof duration === 'string' && (duration.includes('s') || duration.includes('m') || duration.includes('h'))) {
        return duration;
    }
    
    // Преобразуем в число
    const seconds = parseFloat(duration);
    if (isNaN(seconds)) return '-';
    
    // Форматируем в зависимости от длительности
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
};

// Save last chart data for language switching
let lastChartData = {
    testsOverTime: null,
    resultsDistribution: null,
    priorityDistribution: null,
    testCasesCreation: null,
    testExecution: null,
    testFlakiness: null,
    foldersAndTests: null,
    topContributors: null
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard charts initializing...');
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded! Dashboard charts will not work.');
        // Display a message on the page
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            container.innerHTML = `
                <div class="text-center text-red-500 p-4">
                    Error: Chart.js library is not loaded. Dashboard charts cannot be displayed.
                </div>
            `;
        });
        return;
    }
    
    // Функция для ожидания загрузки DOM элементов
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded yet, waiting...');
        await new Promise(resolve => {
            const checkChart = setInterval(() => {
                if (typeof Chart !== 'undefined') {
                    clearInterval(checkChart);
                    resolve();
                }
            }, 100);
        });
    }

    const projectSelector = document.getElementById('projectSelector');
    if (projectSelector) {
        // Update dashboard when project selection changes
        projectSelector.addEventListener('change', (e) => {
            const projectId = e.target.value;
            if (projectId) {
                fetchData(projectId);
            }
        });

        // Initial load with selected project
        const selectedProject = projectSelector.value;
        if (selectedProject) {
            fetchData(selectedProject);
        }
    }
});

// График успешности тестов
function createSuccessRateChart(data) {
    const ctx = document.getElementById('successRateChart');
    if (!ctx || typeof Chart === 'undefined') {
        console.log('Canvas or Chart.js not found for successRateChart');
        return;
    }

    try {
        if (window.successRateChart && typeof window.successRateChart.destroy === 'function') {
            window.successRateChart.destroy();
        }

        // Ensure data is valid
        const labels = Array.isArray(data.labels) ? data.labels : [];
        const successRate = Array.isArray(data.success_rate) ? data.success_rate : [];

        window.successRateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: typeof t === 'function' ? t('successRate') : 'Success Rate',
                    data: successRate,
                    borderColor: chartColors.success,
                    backgroundColor: `${chartColors.success}33`,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating success rate chart:', error);
    }
}

// График распределения результатов
function createResultsChart(data) {
    console.log('Creating results chart with data:', data);
    
    const ctx = document.getElementById('resultsChart');
    if (!ctx || typeof Chart === 'undefined') {
        console.log('Canvas or Chart.js not found');
        return;
    }

    // Очищаем предыдущий график, если он существует
    if (window.resultsChart && typeof window.resultsChart.destroy === 'function') {
        window.resultsChart.destroy();
    }

    // Подготавливаем данные
    let passed = 0, failed = 0, skipped = 0;
    
    try {
        // Обрабатываем разные форматы данных
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.status === 'passed') passed += item.count;
                else if (item.status === 'failed') failed += item.count;
                else if (item.status === 'skipped') skipped += item.count;
            });
        } else if (data && typeof data === 'object') {
            passed = data.passed || 0;
            failed = data.failed || 0;
            skipped = data.skipped || 0;
        }
    } catch (error) {
        console.error('Error processing results data:', error);
    }

    // Create label variables to avoid potential issues with t() function
    const passedLabel = typeof t === 'function' ? t('resultsPassed') : 'Passed';
    const failedLabel = typeof t === 'function' ? t('resultsFailed') : 'Failed';
    const skippedLabel = typeof t === 'function' ? t('resultsSkipped') : 'Skipped';

    // Создаем новый график
    try {
        window.resultsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [passedLabel, failedLabel, skippedLabel],
                datasets: [{
                    data: [passed, failed, skipped],
                    backgroundColor: [
                        chartColors.success,
                        chartColors.danger,
                        chartColors.warning
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = passed + failed + skipped;
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating results chart:', error);
    }
}

// График распределения по приоритетам
function createPriorityChart(data) {
    console.log('Creating priority chart with data:', data);
    
    const ctx = document.getElementById('priorityChart');
    if (!ctx || typeof Chart === 'undefined') {
        console.log('Canvas or Chart.js not found');
        return;
    }

    // Очищаем предыдущий график, если он существует
    if (window.priorityChart && typeof window.priorityChart.destroy === 'function') {
        window.priorityChart.destroy();
    }

    // Подготавливаем данные
    let high = 0, medium = 0, low = 0;
    
    try {
        // Обрабатываем разные форматы данных
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.priority === 'high') high += item.count;
                else if (item.priority === 'medium') medium += item.count;
                else if (item.priority === 'low') low += item.count;
            });
        } else if (data && typeof data === 'object') {
            high = data.high || 0;
            medium = data.medium || 0;
            low = data.low || 0;
        }
    } catch (error) {
        console.error('Error processing priority data:', error);
    }

    // Create label variables to avoid potential issues with t() function
    const highLabel = typeof t === 'function' ? t('high') : 'High';
    const mediumLabel = typeof t === 'function' ? t('medium') : 'Medium';
    const lowLabel = typeof t === 'function' ? t('low') : 'Low';
    const testsLabel = typeof t === 'function' ? t('numberOfTests') : 'Number of Tests';

    // Создаем новый график
    try {
        window.priorityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [highLabel, mediumLabel, lowLabel],
                datasets: [{
                    label: testsLabel,
                    data: [high, medium, low],
                    backgroundColor: [
                        chartColors.danger,
                        chartColors.warning,
                        chartColors.info
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                const total = high + medium + low;
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating priority chart:', error);
    }
}

// График создания тест-кейсов
function createCreationActivityChart(data) {
    console.log('Creating creation activity chart with data:', data);
    
    const ctx = document.getElementById('creationChart');
    if (!ctx || typeof Chart === 'undefined') {
        console.log('Canvas or Chart.js not found');
        return;
    }
    
    try {
        // Очищаем предыдущий график, если он существует
        if (window.creationChart && window.creationChart.destroy) {
            window.creationChart.destroy();
        }

        // Check if data is an array
        if (!Array.isArray(data)) {
            console.log('No valid data for creation activity chart');
            return;
        }

        // Преобразуем данные в нужный формат
        const dailyData = data; // API возвращает уже дневные данные
        
        // Рассчитываем кумулятивные данные
        const cumulativeData = [];
        let total = 0;
        
        for (let i = 0; i < dailyData.length; i++) {
            total += dailyData[i].count;
            cumulativeData.push({
                date: dailyData[i].date,
                count: total
            });
        }

        // Create label variables to avoid potential issues with t() function
        const dailyLabel = typeof t === 'function' ? t('dailyTestsCreated') : 'Daily Tests Created';
        const totalLabel = typeof t === 'function' ? t('totalTests') : 'Total Tests';

        window.creationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyData.map(item => item.date),
                datasets: [
                    {
                        label: dailyLabel,
                        data: dailyData.map(item => item.count),
                        borderColor: chartColors.info,
                        backgroundColor: 'transparent',
                        tension: 0.4
                    },
                    {
                        label: totalLabel,
                        data: cumulativeData.map(item => item.count),
                        borderColor: chartColors.purple,
                        backgroundColor: `${chartColors.purple}33`,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: totalLabel
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating creation activity chart:', error);
    }
}

// Обновление статистики по авторам
function updateAuthorStats(data) {
    const container = document.getElementById('authorStatsContainer');
    if (!container) {
        console.log('Author stats container not found');
        return;
    }
    
    // Log the contributors data for debugging
    console.log('Top contributors data received:', data);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-4">
                ${t('noContributorsYet')}
            </div>
        `;
        return;
    }
    
    // Сортируем авторов по количеству тестов (по убыванию)
    const sortedAuthors = [...data].sort((a, b) => b.count - a.count);
    console.log('Sorted contributors:', sortedAuthors);

    container.innerHTML = sortedAuthors.map(author => {
        const authorName = author.author || t('unknownUser');
        const testCount = author.count || 0;
        const testsWord = testCount === 1 ? t('test') : t('tests');

        return `
            <div class="flex justify-between items-center mb-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${authorName}</span>
                <span class="text-sm text-gray-600 dark:text-gray-400">${testCount} ${testsWord}</span>
            </div>
        `;
    }).join('');
}

// График нестабильности тестов
function createFlakinessChart(data) {
    console.log('Creating flakiness chart with data:', data);
    
    // Берем div-контейнер, а не canvas, потому что нам нужно заменить содержимое
    const container = document.getElementById('flakinessContainer');
    if (!container) {
        console.log('Flakiness container not found');
        return;
    }

    // Очищаем предыдущий контент
    container.innerHTML = '';
    
    // Проверяем, есть ли данные
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('No flaky tests data available');
        // Показываем сообщение об отсутствии данных
        container.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-4">
                ${t('noFlakyTestsFound')}
            </div>
        `;
        return;
    }

    // Если у нас есть нестабильные тесты, выводим их список
    const testItems = data.map(test => {
        // Формируем полоску с последними статусами прогонов
        const runStatuses = test.last_runs.map(status => {
            let color = '';
            switch(status) {
                case 'passed': color = 'bg-green-500'; break;
                case 'failed': color = 'bg-red-500'; break;
                case 'error': color = 'bg-yellow-500'; break;
                default: color = 'bg-gray-400';
            }
            return `<div class="${color} w-4 h-4 rounded-full mx-1" title="${status}"></div>`;
        }).join('');

        return `
            <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-3">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-medium text-gray-800 dark:text-white">${test.title}</h4>
                    <span class="text-sm text-gray-500 dark:text-gray-400">${t('statusChanges')}: ${test.changes}</span>
                </div>
                <div class="flex mt-2">
                    <span class="text-sm text-gray-600 dark:text-gray-400 mr-2">${t('lastRuns')}:</span>
                    <div class="flex">
                        ${runStatuses}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Отображаем список тестов
    container.innerHTML = testItems;
}
// Dashboard Charts - Новая версия
console.log('Loading dashboard-charts.js - новая версия');

// Статус загрузки для избежания дублирования запросов
let isDataLoading = false;

// Глобальные ссылки на графики для обновления
let successRateChart = null;
let resultsChart = null;
let priorityChart = null;
let creationChart = null;

// Используем глобальную функцию для переводов, не переопределяя её
function getTranslation(key) {
    // Используем глобальную функцию t(), если она доступна
    if (typeof window.t === 'function') {
        return window.t(key);
    }
    // Или используем i18n напрямую
    else if (window.i18n && typeof window.i18n.t === 'function') {
        return window.i18n.t(key);
    }
    // В крайнем случае возвращаем ключ
    return key;
};

// Цвета для графиков 
const chartColors = {
    success: '#10B981', // Зеленый
    error: '#EF4444',   // Красный
    warning: '#F59E0B', // Оранжевый
    info: '#3B82F6',    // Синий
    purple: '#8B5CF6',  // Фиолетовый
    pink: '#EC4899'     // Розовый
};

// Базовые функции форматирования
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString();
}

function formatDuration(seconds) {
    if (typeof seconds !== 'number') return '0s';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
}

// Инициализация дашборда
function initializeDashboard() {
    console.log('Initializing dashboard');
    
    // Сначала обновляем переводы на странице
    translateDashboardElements();
    
    // Затем загружаем данные
    const projectSelector = document.getElementById('projectSelector');
    
    // Загружаем проекты если список пуст
    if (projectSelector && projectSelector.options.length <= 1) {
        console.log('Loading projects');
        loadProjects(projectSelector);
    } else if (projectSelector && projectSelector.value) {
        // Если проект уже выбран, загружаем данные
        console.log('Project already selected:', projectSelector.value);
        loadDashboardData(projectSelector.value);
    } else if (projectSelector && projectSelector.options.length > 1) {
        // Выбираем первый проект в списке
        projectSelector.value = projectSelector.options[1].value;
        console.log('Selected first project:', projectSelector.value);
        loadDashboardData(projectSelector.value);
    } else {
        console.warn('Cannot initialize dashboard - no project selector found');
    }
    
    // Добавляем обработчик события изменения проекта
    if (projectSelector) {
        projectSelector.addEventListener('change', function() {
            loadDashboardData(this.value);
        });
    }
    
    // Добавляем обработчик события изменения языка
    document.addEventListener('i18n:initialized', function() {
        console.log('Localization initialized, updating translations');
        translateDashboardElements();
    });
}

// Функция для обновления переводов на странице
function translateDashboardElements() {
    // Обновляем элементы с атрибутом data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const translation = getTranslation(key);
            if (translation && translation !== key) {
                element.textContent = translation;
            }
        }
    });
}

// Загрузка списка проектов
async function loadProjects(selector) {
    try {
        console.log('Loading projects from API');
        // Используем fetchWithAuth из user.js, который правильно формирует URL
        const response = await fetchWithAuth('projects/');
        if (!response.ok) {
            throw new Error(`Failed to load projects: ${response.status}`);
        }
        
        const projects = await response.json();
        console.log('Projects loaded:', projects.length);
        
        // Очищаем селектор, оставляя только первый элемент (All Projects)
        const firstOption = selector.options[0];
        selector.innerHTML = '';
        if (firstOption) {
            selector.appendChild(firstOption);
        }
        
        // Добавляем проекты в селектор
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            selector.appendChild(option);
        });
        
        // Выбираем первый проект и загружаем данные
        if (projects.length > 0 && selector.options.length > 1) {
            selector.value = selector.options[1].value;
            console.log('Selected project:', selector.value);
            loadDashboardData(selector.value);
        } else {
            console.warn('No projects available');
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Загрузка данных для дашборда
async function loadDashboardData(projectId) {
    if (!projectId) {
        console.warn('No project ID provided');
        return;
    }
    
    if (isDataLoading) {
        console.log('Data already loading, skipping request');
        return;
    }
    
    isDataLoading = true;
    console.log('Loading dashboard data for project:', projectId);

    try {
        // Запрос основных метрик
        await loadBasicMetrics(projectId);
        
        // Загрузка данных для графиков (параллельно)
        await Promise.all([
            loadSuccessRateData(projectId),
            loadResultsDistribution(projectId),
            loadPriorityDistribution(projectId),
            loadCreationActivity(projectId),
            loadFlakinessData(projectId),
            loadContributorsData(projectId)
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    } finally {
        isDataLoading = false;
    }
}

// ВРЕМЕННЫЕ МОКОВЫЕ ДАННЫЕ ДЛЯ СКРИНШОТА - УДАЛИТЬ ПОСЛЕ!
function setupMockData() {
    console.log('Setting up mock data for diploma screenshot - direct call');
    
    // Основные метрики
    updateTotalTests(248);
    updateSuccessRate({passed: 215, failed: 18, error: 0, skipped: 15});
    updateExecutionTime(3.8);
    
    // График успешности тестов
    const successRateData = {
        labels: ['01.02', '02.02', '03.02', '04.02', '05.02', '06.02', '07.02', '08.02', '09.02', '10.02'],
        success_rate: [85, 88, 90, 92, 91, 95, 96, 92, 94, 95]
    };
    renderSuccessRateChart(successRateData);
    
    // График распределения результатов
    const resultsData = [
        {status: 'passed', count: 215},
        {status: 'failed', count: 18},
        {status: 'skipped', count: 15}
    ];
    renderResultsChart(resultsData);
    
    // График приоритетов
    const priorityData = [
        {priority: 'high', count: 76},
        {priority: 'medium', count: 128},
        {priority: 'low', count: 44}
    ];
    renderPriorityChart(priorityData);
    
    // График создания тестов
    const creationData = [
        {date: '2025-03-01', count: 5},
        {date: '2025-03-02', count: 8},
        {date: '2025-03-03', count: 12},
        {date: '2025-03-04', count: 7},
        {date: '2025-03-05', count: 9},
        {date: '2025-03-06', count: 11},
        {date: '2025-03-07', count: 15},
        {date: '2025-03-08', count: 6},
        {date: '2025-03-09', count: 9},
        {date: '2025-03-10', count: 14}
    ];
    renderCreationChart(creationData);
    
    // Нестабильные тесты
    const flakinessData = [
        {
            test_id: 1,
            title: 'Авторизация через Google',
            changes: 4,
            last_runs: ['passed', 'failed', 'passed', 'passed', 'failed']
        },
        {
            test_id: 2,
            title: 'Загрузка профиля пользователя',
            changes: 3,
            last_runs: ['passed', 'failed', 'passed', 'passed', 'passed']
        },
        {
            test_id: 3,
            title: 'Обновление аватара',
            changes: 3,
            last_runs: ['failed', 'passed', 'failed', 'passed', 'passed']
        }
    ];
    renderFlakinessData(flakinessData);
    
    // Контрибьюторы
    const contributorsData = [
        {author: 'Александр С.', count: 72},
        {author: 'Екатерина М.', count: 68},
        {author: 'Иван И.', count: 53},
        {author: 'Мария К.', count: 42},
        {author: 'Дмитрий В.', count: 13}
    ];
    renderContributorsData(contributorsData);
}

// Загрузка основных метрик (карточки вверху)
async function loadBasicMetrics(projectId) {
    try {
        // Запрашиваем данные выполнения тестов - содержат все основные метрики
        // Используем единообразный формат URL с префиксом
        const urlExecution = `analytics/test-execution/?project_id=${projectId}`;
        console.log(`Fetching execution data from: ${urlExecution}`);
        
        const executionResponse = await fetchWithAuth(urlExecution);
        
        if (executionResponse.ok) {
            const executionData = await executionResponse.json();
            console.log('Received execution data:', executionData);
            
            // Обновляем количество тестов
            if (executionData.total_tests !== undefined) {
                updateTotalTests(executionData.total_tests);
            } else {
                console.warn('No total_tests field in response');
                updateTotalTests(0);
            }
            
            // Обновляем успешность и среднее время
            if (executionData.status_distribution) {
                updateSuccessRate(executionData.status_distribution);
            } else {
                console.warn('No status_distribution field in response');
                updateSuccessRate({ passed: 0, failed: 0, error: 0, skipped: 0 });
            }
            
            if (executionData.avg_duration !== undefined) {
                updateExecutionTime(executionData.avg_duration);
            } else {
                console.warn('No avg_duration field in response');
                updateExecutionTime(0);
            }
        } else {
            console.warn(`Failed to load execution data: ${executionResponse.status}`);
            
            // Резервный вариант - использовать fetchWithAuth с более прямым URL
            try {
                // Обновленная версия fetchWithAuth должна справиться с любым форматом URL
                const backupResponse = await fetchWithAuth(`/api/analytics/test-execution/?project_id=${projectId}`);
                
                console.log(`Backup response status: ${backupResponse.status}`);
                if (backupResponse.ok) {
                    const backupData = await backupResponse.json();
                    console.log('Backup request succeeded:', backupData);
                    
                    // Обновляем данные из резервного запроса
                    if (backupData.total_tests !== undefined) {
                        updateTotalTests(backupData.total_tests);
                    }
                    if (backupData.status_distribution) {
                        updateSuccessRate(backupData.status_distribution);
                    }
                    if (backupData.avg_duration !== undefined) {
                        updateExecutionTime(backupData.avg_duration);
                    }
                } else {
                    // Установим дефолтные значения
                    updateTotalTests(0);
                    updateSuccessRate({ passed: 0, failed: 0, error: 0, skipped: 0 });
                    updateExecutionTime(0);
                }
            } catch (backupError) {
                console.error('Backup request failed:', backupError);
                // Установим дефолтные значения
                updateTotalTests(0);
                updateSuccessRate({ passed: 0, failed: 0, error: 0, skipped: 0 });
                updateExecutionTime(0);
            }
        }
    } catch (error) {
        console.error('Error loading metrics:', error);
        updateTotalTests(0);
        updateSuccessRate({ passed: 0, failed: 0, error: 0, skipped: 0 });
        updateExecutionTime(0);
    }
}

// Обновление отображения количества тестов
function updateTotalTests(count) {
    const element = document.getElementById('totalTests');
    if (element) {
        element.textContent = count;
        console.log('Updated total tests:', count);
    }
}

// Обновление отображения процента успешности
function updateSuccessRate(distribution) {
    const element = document.getElementById('successRate');
    if (element) {
        const { passed = 0, failed = 0, error = 0, skipped = 0 } = distribution;
        const total = passed + failed + error + skipped;
        const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
        element.textContent = `${rate}%`;
        console.log('Updated success rate:', rate, '%');
    }
}

// Обновление отображения среднего времени выполнения
function updateExecutionTime(duration) {
    const element = document.getElementById('avgExecutionTime');
    if (element) {
        element.textContent = formatDuration(duration);
        console.log('Updated execution time:', formatDuration(duration));
    }
}

// Загрузка данных об успешности выполнения для графика
async function loadSuccessRateData(projectId) {
    try {
        const url = `analytics/tests-over-time/?project_id=${projectId}`;
        const response = await fetchWithAuth(url);
        
        if (response.ok) {
            const data = await response.json();
            renderSuccessRateChart(data);
        } else {
            console.warn(`Failed to load success rate data: ${response.status}`);
            renderSuccessRateChart({ labels: [], success_rate: [] });
        }
    } catch (error) {
        console.error('Error loading success rate data:', error);
        renderSuccessRateChart({ labels: [], success_rate: [] });
    }
}

// Отрисовка графика успешности выполнения
function renderSuccessRateChart(data) {
    const canvas = document.getElementById('successRateChart');
    if (!canvas || typeof Chart === 'undefined') {
        console.warn('Cannot render success rate chart - missing canvas or Chart.js');
        return;
    }
    
    if (successRateChart) {
        successRateChart.destroy();
    }
    
    // Подготовка данных
    const labels = Array.isArray(data.labels) ? data.labels : [];
    const values = Array.isArray(data.success_rate) ? data.success_rate : [];
    
    // Создание графика
    successRateChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Success Rate',
                data: values,
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
    
    console.log('Success rate chart rendered');
}

// Загрузка распределения результатов тестов
async function loadResultsDistribution(projectId) {
    try {
        const url = `analytics/results-distribution/?project_id=${projectId}`;
        const response = await fetchWithAuth(url);
        
        if (response.ok) {
            const data = await response.json();
            renderResultsChart(data);
        } else {
            console.warn(`Failed to load results distribution: ${response.status}`);
            renderResultsChart([]);
        }
    } catch (error) {
        console.error('Error loading results distribution:', error);
        renderResultsChart([]);
    }
}

// Получение локализованного значения с резервным копированием
function getLocalizedString(key, defaultValue) {
    const translation = getTranslation(key);
    // Если перевод равен ключу (не найден), возвращаем значение по умолчанию
    return (translation === key) ? defaultValue : translation;
}

// Отрисовка графика распределения результатов
function renderResultsChart(data) {
    const canvas = document.getElementById('resultsChart');
    if (!canvas || typeof Chart === 'undefined') {
        console.warn('Cannot render results chart - missing canvas or Chart.js');
        return;
    }
    
    if (resultsChart) {
        resultsChart.destroy();
    }
    
    // Подготовка данных
    let passed = 0, failed = 0, skipped = 0;
    
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item.status === 'passed') passed += item.count;
            else if (item.status === 'failed') failed += item.count;
            else if (item.status === 'skipped') skipped += item.count;
        });
    }
    
    // Получаем переведенные метки
    const passedLabel = getLocalizedString('resultsPassed', 'Passed');
    const failedLabel = getLocalizedString('resultsFailed', 'Failed');
    const skippedLabel = getLocalizedString('resultsSkipped', 'Skipped');
    
    // Создание графика
    resultsChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: [passedLabel, failedLabel, skippedLabel],
            datasets: [{
                data: [passed, failed, skipped],
                backgroundColor: [
                    chartColors.success,
                    chartColors.error,
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
    
    console.log('Results chart rendered');
}

// Загрузка распределения по приоритету
async function loadPriorityDistribution(projectId) {
    try {
        const url = `analytics/priority-distribution/?project_id=${projectId}`;
        const response = await fetchWithAuth(url);
        
        if (response.ok) {
            const data = await response.json();
            renderPriorityChart(data);
        } else {
            console.warn(`Failed to load priority distribution: ${response.status}`);
            renderPriorityChart([]);
        }
    } catch (error) {
        console.error('Error loading priority distribution:', error);
        renderPriorityChart([]);
    }
}

// Отрисовка графика распределения по приоритету
function renderPriorityChart(data) {
    const canvas = document.getElementById('priorityChart');
    if (!canvas || typeof Chart === 'undefined') {
        console.warn('Cannot render priority chart - missing canvas or Chart.js');
        return;
    }
    
    if (priorityChart) {
        priorityChart.destroy();
    }
    
    // Подготовка данных
    let high = 0, medium = 0, low = 0;
    
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item.priority === 'high') high += item.count;
            else if (item.priority === 'medium') medium += item.count;
            else if (item.priority === 'low') low += item.count;
        });
    }
    
    // Получаем локализованные метки
    const highLabel = getLocalizedString('high', 'High');
    const mediumLabel = getLocalizedString('medium', 'Medium');
    const lowLabel = getLocalizedString('low', 'Low');
    const numberOfTestsLabel = getLocalizedString('numberOfTests', 'Number of Tests');
    
    // Создание графика
    priorityChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: [highLabel, mediumLabel, lowLabel],
            datasets: [{
                label: numberOfTestsLabel,
                data: [high, medium, low],
                backgroundColor: [
                    chartColors.error,
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
                }
            }
        }
    });
    
    console.log('Priority chart rendered');
}

// Загрузка данных активности создания тестов
async function loadCreationActivity(projectId) {
    try {
        const url = `analytics/test-cases-creation/?project_id=${projectId}`;
        const response = await fetchWithAuth(url);
        
        if (response.ok) {
            const data = await response.json();
            renderCreationChart(data);
        } else {
            console.warn(`Failed to load creation activity: ${response.status}`);
            renderCreationChart([]);
        }
    } catch (error) {
        console.error('Error loading creation activity:', error);
        renderCreationChart([]);
    }
}

// Отрисовка графика активности создания тестов
function renderCreationChart(data) {
    const canvas = document.getElementById('creationChart');
    if (!canvas || typeof Chart === 'undefined') {
        console.warn('Cannot render creation chart - missing canvas or Chart.js');
        return;
    }
    
    if (creationChart) {
        creationChart.destroy();
    }
    
    // Подготовка данных
    let dailyData = Array.isArray(data) ? data : [];
    
    // Если данных нет, создаем пустые метки
    if (dailyData.length === 0) {
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dailyData.push({
                date: date.toISOString().split('T')[0],
                count: 0
            });
        }
    }
    
    // Рассчитываем кумулятивные данные
    const cumulativeData = [];
    let total = 0;
    
    dailyData.forEach(item => {
        total += item.count || 0;
        cumulativeData.push({
            date: item.date,
            count: total
        });
    });
    
    // Получаем локализованные метки
    const dailyTestsCreatedLabel = getLocalizedString('dailyTestsCreated', 'Daily Tests Created');
    const totalTestsLabel = getLocalizedString('totalTests', 'Total Tests');
    
    // Создание графика
    creationChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: dailyData.map(item => item.date),
            datasets: [
                {
                    label: dailyTestsCreatedLabel,
                    data: dailyData.map(item => item.count),
                    borderColor: chartColors.info,
                    backgroundColor: 'transparent',
                    tension: 0.4
                },
                {
                    label: totalTestsLabel,
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
                    beginAtZero: true
                }
            }
        }
    });
    
    console.log('Creation chart rendered');
}

// Загрузка данных о нестабильных тестах
async function loadFlakinessData(projectId) {
    try {
        const url = `analytics/test-flakiness/?project_id=${projectId}`;
        const response = await fetchWithAuth(url);
        
        if (response.ok) {
            const data = await response.json();
            renderFlakinessData(data);
        } else {
            console.warn(`Failed to load flakiness data: ${response.status}`);
            renderFlakinessData([]);
        }
    } catch (error) {
        console.error('Error loading flakiness data:', error);
        renderFlakinessData([]);
    }
}

// Отображение данных о нестабильных тестах
function renderFlakinessData(data) {
    const container = document.getElementById('flakinessContainer');
    if (!container) {
        console.warn('Cannot render flakiness data - missing container');
        return;
    }
    
    // Очищаем предыдущий контент
    container.innerHTML = '';
    
    // Получаем локализованные строки
    const noFlakyTestsFound = getLocalizedString('noFlakyTestsFound', 'No flaky tests found');
    const statusChangesLabel = getLocalizedString('statusChanges', 'Status Changes');
    const lastRunsLabel = getLocalizedString('lastRuns', 'Last Runs');
    
    // Если данных нет - показываем сообщение
    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-4">
                ${noFlakyTestsFound}
            </div>
        `;
        return;
    }
    
    // Создаем список нестабильных тестов
    const testItems = data.map(test => {
        // Округляем число изменений
        const changesCount = typeof test.changes === 'number' ? Math.round(test.changes) : test.changes;
        
        // Создаем индикаторы статусов последних прогонов
        const runStatuses = Array.isArray(test.last_runs) ? test.last_runs.map(status => {
            let color = '';
            switch(status) {
                case 'passed': color = 'bg-green-500'; break;
                case 'failed': color = 'bg-red-500'; break;
                case 'error': color = 'bg-yellow-500'; break;
                default: color = 'bg-gray-400';
            }
            return `<div class="${color} w-4 h-4 rounded-full mx-1" title="${status}"></div>`;
        }).join('') : '';
        
        return `
            <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-3">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-medium text-gray-800 dark:text-white">${test.title || 'Unnamed Test'}</h4>
                    <span class="text-sm text-gray-500 dark:text-gray-400">${statusChangesLabel}: ${changesCount}</span>
                </div>
                <div class="flex mt-2">
                    <span class="text-sm text-gray-600 dark:text-gray-400 mr-2">${lastRunsLabel}:</span>
                    <div class="flex">
                        ${runStatuses}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем элементы в контейнер
    container.innerHTML = testItems;
    console.log('Flakiness data rendered');
}

// Загрузка данных о топ-контрибьюторах
async function loadContributorsData(projectId) {
    try {
        const url = `analytics/top-contributors/?project_id=${projectId}`;
        const response = await fetchWithAuth(url);
        
        if (response.ok) {
            const data = await response.json();
            renderContributorsData(data);
        } else {
            console.warn(`Failed to load contributors data: ${response.status}`);
            renderContributorsData([]);
        }
    } catch (error) {
        console.error('Error loading contributors data:', error);
        renderContributorsData([]);
    }
}

// Отображение данных о топ-контрибьюторах
function renderContributorsData(data) {
    const container = document.getElementById('authorStatsContainer');
    if (!container) {
        console.warn('Cannot render contributors data - missing container');
        return;
    }
    
    // Очищаем предыдущий контент
    container.innerHTML = '';
    
    // Получаем локализованные строки
    const noContributorsYet = getLocalizedString('noContributorsYet', 'No contributors yet');
    const unknownUser = getLocalizedString('unknownUser', 'Unknown User');
    const testLabel = getLocalizedString('test', 'test');
    const testsLabel = getLocalizedString('tests', 'tests');
    
    // Если данных нет - показываем сообщение
    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-4">
                ${noContributorsYet}
            </div>
        `;
        return;
    }
    
    // Сортируем авторов по количеству тестов
    const sortedAuthors = [...data].sort((a, b) => b.count - a.count);
    
    // Создаем элементы
    const authorItems = sortedAuthors.map(author => {
        const authorName = author.author || unknownUser;
        const testCount = author.count || 0;
        const testsWord = testCount === 1 ? testLabel : testsLabel;
        
        return `
            <div class="flex justify-between items-center mb-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${authorName}</span>
                <span class="text-sm text-gray-600 dark:text-gray-400">${testCount} ${testsWord}</span>
            </div>
        `;
    }).join('');
    
    // Добавляем элементы в контейнер
    container.innerHTML = authorItems;
    console.log('Contributors data rendered');
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing dashboard');
    
    // Задержка для уверенности, что все зависимые скрипты загружены
    setTimeout(initializeDashboard, 500);
    
    // Повторная инициализация на случай, если первая не удалась
    setTimeout(function() {
        console.log('Retrying dashboard initialization');
        initializeDashboard();
    }, 2000);
});

// Делаем функции доступными глобально
window.initializeDashboardCharts = initializeDashboard;
window.fetchData = loadDashboardData;
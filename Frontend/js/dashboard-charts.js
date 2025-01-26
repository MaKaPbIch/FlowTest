// Dashboard Charts

// Chart colors
const chartColors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899'
};

// Utility functions
const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
};

const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
};

// API calls
async function fetchData(projectId) {
    if (!projectId) {
        console.log('No project selected, skipping data fetch');
        // Очищаем все графики и статистику
        updateDashboardStats(null);
        return;
    }

    try {
        const headers = {
            'Authorization': `Bearer ${localStorage.getItem('access')}`,
            'Content-Type': 'application/json'
        };

        console.log('Fetching data for project:', projectId);

        const urls = [
            `${config.API_BASE_URL}${config.API_PREFIX}/statistics/tests_over_time/${projectId}/`,
            `${config.API_BASE_URL}${config.API_PREFIX}/statistics/results_distribution/${projectId}/`,
            `${config.API_BASE_URL}${config.API_PREFIX}/statistics/priority_distribution/${projectId}/`,
            `${config.API_BASE_URL}${config.API_PREFIX}/statistics/test_cases_creation/${projectId}/`,
            `${config.API_BASE_URL}${config.API_PREFIX}/statistics/test_execution/${projectId}/`,
            `${config.API_BASE_URL}${config.API_PREFIX}/statistics/test_flakiness/${projectId}/`,
            `${config.API_BASE_URL}${config.API_PREFIX}/projects/${projectId}/folders_and_test_cases/`
        ];

        // Загружаем данные для всех графиков
        const responses = await Promise.all(
            urls.map(url => 
                fetch(url, { headers })
                    .then(async response => {
                        if (!response.ok) {
                            const text = await response.text();
                            console.error(`Error from ${url}:`, text);
                            throw new Error(`API endpoint returned status: ${response.status}`);
                        }
                        const data = await response.json();
                        return data;
                    })
            )
        );

        // Получаем данные из ответов
        const [
            testsOverTime,
            resultsDistribution,
            priorityDistribution,
            creationStats,
            executionStats,
            flakinessStats,
            foldersAndTests
        ] = responses;

        // Сохраняем данные для обновления при смене языка
        lastChartData = {
            testsOverTime,
            resultsDistribution,
            priorityDistribution,
            creationStats,
            executionStats,
            flakinessStats,
            foldersAndTests
        };

        // Обновляем графики и статистику
        if (executionStats) {
            updateDashboardStats(executionStats);
        }
        if (testsOverTime) {
            createSuccessRateChart(testsOverTime);
        }
        if (resultsDistribution) {
            createResultsChart(resultsDistribution);
        }
        if (priorityDistribution) {
            createPriorityChart(priorityDistribution);
        }
        if (creationStats) {
            createCreationActivityChart(creationStats);
        }
        if (flakinessStats) {
            createFlakinessChart(flakinessStats);
        }

        // Обновляем количество тест-кейсов
        const totalTests = document.getElementById('totalTests');
        if (totalTests && foldersAndTests && foldersAndTests.test_cases) {
            totalTests.textContent = foldersAndTests.test_cases.length;
        }

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // В случае ошибки очищаем графики
        updateDashboardStats(null);
    }
}

// Сохраняем последние данные для обновления графиков при смене языка
let lastChartData = {
    testsOverTime: null,
    resultsDistribution: null,
    priorityDistribution: null,
    creationStats: null,
    executionStats: null,
    flakinessStats: null,
    foldersAndTests: null
};

// Функция для обновления графиков при смене языка
window.updateCharts = function() {
    if (lastChartData.testsOverTime) {
        createSuccessRateChart(lastChartData.testsOverTime);
    }
    if (lastChartData.resultsDistribution) {
        createResultsChart(lastChartData.resultsDistribution);
    }
    if (lastChartData.priorityDistribution) {
        createPriorityChart(lastChartData.priorityDistribution);
    }
    if (lastChartData.creationStats) {
        createCreationActivityChart(lastChartData.creationStats);
    }
    if (lastChartData.executionStats) {
        updateDashboardStats(lastChartData.executionStats);
    }
    if (lastChartData.flakinessStats) {
        createFlakinessChart(lastChartData.flakinessStats);
    }
};

// Обновление статистики на дашборде
function updateDashboardStats(data) {
    // Получаем элементы статистики
    const totalTests = document.getElementById('totalTests');
    const successRate = document.getElementById('successRate');
    const avgExecutionTime = document.getElementById('avgExecutionTime');

    // Если нет данных или массив пустой, очищаем статистику
    if (!data || !Array.isArray(data) || data.length === 0) {
        if (totalTests) totalTests.textContent = '0';
        if (successRate) successRate.textContent = '0%';
        if (avgExecutionTime) avgExecutionTime.textContent = '0s';
        return;
    }

    // Получаем последние данные
    const latestStats = data[data.length - 1];
    
    // Обновляем показатели
    if (totalTests) totalTests.textContent = latestStats.total || '0';
    
    if (successRate) {
        const rate = latestStats.total > 0 ? 
            Math.round((latestStats.passed / latestStats.total) * 100) : 0;
        successRate.textContent = `${rate}%`;
    }
    
    if (avgExecutionTime) {
        const avgTime = latestStats.avg_time ? 
            Math.round(parseFloat(latestStats.avg_time)) : 0;
        avgExecutionTime.textContent = `${avgTime}s`;
    }
}

// График успешности тестов
function createSuccessRateChart(data) {
    const ctx = document.getElementById('successRateOverTime');
    if (!ctx) return;

    if (window.successRateChart) {
        window.successRateChart.destroy();
    }

    window.successRateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: t('successRate'),
                data: data.success_rate,
                borderColor: chartColors.success,
                backgroundColor: `${chartColors.success}33`,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: t('successRate')
                    }
                }
            }
        }
    });
}

// График распределения результатов
function createResultsChart(data) {
    const ctx = document.getElementById('resultsDistribution');
    if (!ctx) return;

    if (window.resultsChart) {
        window.resultsChart.destroy();
    }

    window.resultsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [t('resultsPassed'), t('resultsFailed'), t('resultsSkipped')],
            datasets: [{
                data: [data.passed, data.failed, data.skipped],
                backgroundColor: [
                    chartColors.success,
                    chartColors.error,
                    chartColors.warning
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// График распределения по приоритетам
function createPriorityChart(data) {
    const ctx = document.getElementById('priorityDistribution');
    if (!ctx) return;

    if (window.priorityChart) {
        window.priorityChart.destroy();
    }

    window.priorityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [t('high'), t('medium'), t('low')],
            datasets: [{
                label: t('totalTests'),
                data: [data.high, data.medium, data.low],
                backgroundColor: [
                    chartColors.error,
                    chartColors.warning,
                    chartColors.success
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: t('totalTests')
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
}

// График создания тест-кейсов
function createCreationActivityChart(data) {
    const ctx = document.getElementById('testCaseCreation');
    if (!ctx) return;

    if (window.creationChart) {
        window.creationChart.destroy();
    }

    window.creationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.daily.map(item => item.date),
            datasets: [
                {
                    label: t('dailyTestsCreated'),
                    data: data.daily.map(item => item.count),
                    borderColor: chartColors.info,
                    backgroundColor: 'transparent',
                    tension: 0.4
                },
                {
                    label: t('totalTests'),
                    data: data.cumulative.map(item => item.count),
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
                        text: t('totalTests')
                    }
                }
            }
        }
    });

    // Обновляем статистику по авторам
    updateAuthorStats(data.by_author);
}

// Обновление статистики по авторам
function updateAuthorStats(authorData) {
    const container = document.getElementById('authorStats');
    if (!container || !Array.isArray(authorData)) {
        console.error('Container not found or invalid author data:', authorData);
        return;
    }

    console.log('Updating author stats with data:', authorData);

    // Сортируем авторов по количеству тестов (по убыванию)
    const sortedAuthors = [...authorData].sort((a, b) => b.count - a.count);

    container.innerHTML = sortedAuthors.map(author => {
        const authorName = author.author || author.username || author.email || t('unknownUser');
        const testCount = author.count || 0;
        const testsWord = testCount === 1 ? t('test') : t('tests');

        return `
            <div class="flex justify-between items-center mb-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${authorName}</span>
                <span class="text-sm text-gray-600 dark:text-gray-400">${testCount} ${testsWord}</span>
            </div>
        `;
    }).join('');

    // Если нет данных, показываем сообщение
    if (sortedAuthors.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-4">
                ${t('noContributorsYet')}
            </div>
        `;
    }
}

// График нестабильности тестов
function createFlakinessChart(data) {
    const ctx = document.getElementById('testFlakiness');
    if (!ctx) return;

    // Если уже есть график, удаляем его
    if (window.flakinessChart) {
        window.flakinessChart.destroy();
    }

    // Находим максимальное количество падений для масштабирования
    const maxFails = Math.max(...data.tests.map(test => test.failed_runs));

    // Создаем график
    window.flakinessChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.tests.map(test => test.name),
            datasets: [{
                label: t('failedRuns'),
                data: data.tests.map(test => test.failed_runs),
                backgroundColor: chartColors.warning,
                borderColor: chartColors.warning,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            height: 300,
            scales: {
                x: {
                    beginAtZero: true,
                    min: 0,
                    max: maxFails + 1,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: t('failedRuns')
                    }
                },
                y: {
                    ticks: {
                        autoSkip: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const test = data.tests[context.dataIndex];
                            return [
                                `${t('failedRuns')}: ${test.failed_runs}`,
                                `${t('totalRuns')}: ${test.total_runs}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// Делаем функции доступными глобально
window.fetchData = fetchData;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    const projectSelector = document.getElementById('projectSelector');
    
    // Update dashboard when project selection changes
    projectSelector.addEventListener('change', (e) => {
        const projectId = e.target.value;
        if (projectId) {
            fetchData(projectId);
        }
    });

    // Initial load with selected project
    const initialProjectId = projectSelector.value;
    if (initialProjectId) {
        fetchData(initialProjectId);
    }
});

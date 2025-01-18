const API_BASE_URL = 'http://127.0.0.1:8000/api';

class DashboardManager {
    constructor() {
        this.charts = {
            testsOverTime: null,
            resultsDistribution: null,
            priorityDistribution: null,
            dailyTestCasesChart: null,
            cumulativeTestCasesChart: null,
            authorDistributionChart: null,
            testExecutionChart: null,
            avgExecutionTimeChart: null
        };
    }

    async init() {
        await this.loadStatistics();
        this.initializeCharts();
    }

    async loadStatistics() {
        try {
            const selectedProjectId = localStorage.getItem('selectedProject');
            console.log('Selected project ID:', selectedProjectId);
            if (!selectedProjectId) {
                console.warn('No project selected');
                return;
            }

            console.log('Fetching statistics for project:', selectedProjectId);
            // Загружаем все необходимые данные
            const [testsOverTime, resultsDistribution, priorityDistribution, testCasesCreation, testExecution] = await Promise.all([
                this.fetchTestsOverTime(selectedProjectId),
                this.fetchResultsDistribution(selectedProjectId),
                this.fetchPriorityDistribution(selectedProjectId),
                this.fetchTestCasesCreation(selectedProjectId),
                this.fetchTestExecution(selectedProjectId)
            ]);

            console.log('Received statistics:', {
                testsOverTime,
                resultsDistribution,
                priorityDistribution,
                testCasesCreation,
                testExecution
            });

            // Сохраняем данные
            this.statistics = {
                testsOverTime,
                resultsDistribution,
                priorityDistribution,
                testCasesCreation,
                testExecution
            };
        } catch (error) {
            console.error('Error loading dashboard statistics:', error);
            showNotification('Failed to load dashboard statistics', 'error');
        }
    }

    async fetchTestsOverTime(projectId) {
        const response = await fetchWithAuth(`${API_BASE_URL}/statistics/tests_over_time/${projectId}/`);
        if (!response.ok) throw new Error('Failed to fetch tests over time statistics');
        return await response.json();
    }

    async fetchResultsDistribution(projectId) {
        const response = await fetchWithAuth(`${API_BASE_URL}/statistics/results_distribution/${projectId}/`);
        if (!response.ok) throw new Error('Failed to fetch results distribution');
        return await response.json();
    }

    async fetchPriorityDistribution(projectId) {
        console.log('Fetching priority distribution for project:', projectId);
        const response = await fetchWithAuth(`${API_BASE_URL}/statistics/priority_distribution/${projectId}/`);
        if (!response.ok) throw new Error('Failed to fetch priority distribution');
        const data = await response.json();
        console.log('Priority distribution data:', data);
        return data;
    }

    async fetchTestCasesCreation(projectId) {
        const response = await fetchWithAuth(`${API_BASE_URL}/statistics/test_cases_creation/${projectId}/`);
        if (!response.ok) throw new Error('Failed to fetch test cases creation statistics');
        return await response.json();
    }

    async fetchTestExecution(projectId) {
        const response = await fetchWithAuth(`${API_BASE_URL}/statistics/test_execution/${projectId}/`);
        if (!response.ok) throw new Error('Failed to fetch test execution statistics');
        return await response.json();
    }

    initializeCharts() {
        this.initTestsOverTimeChart();
        this.initResultsDistributionChart();
        this.initPriorityDistributionChart();
        this.initDailyTestCasesChart();
        this.initCumulativeTestCasesChart();
        this.initAuthorDistributionChart();
        this.initTestExecutionChart();
        this.initAvgExecutionTimeChart();
    }

    initTestsOverTimeChart() {
        const ctx = document.getElementById("testsOverTime").getContext("2d");
        const data = this.statistics?.testsOverTime || {
            labels: [],
            success_rate: []
        };

        this.charts.testsOverTime = new Chart(ctx, {
            type: "line",
            data: {
                labels: data.labels,
                datasets: [{
                    label: i18n.t("successRate"),
                    data: data.success_rate,
                    borderColor: "#10B981",
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    initResultsDistributionChart() {
        const ctx = document.getElementById("resultsDistribution").getContext("2d");
        const data = this.statistics?.resultsDistribution || {
            passed: 0,
            failed: 0,
            skipped: 0
        };

        this.charts.resultsDistribution = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: [i18n.t("passed"), i18n.t("failed"), i18n.t("skipped")],
                datasets: [{
                    data: [data.passed, data.failed, data.skipped],
                    backgroundColor: ["#10B981", "#EF4444", "#F59E0B"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    initPriorityDistributionChart() {
        console.log('Initializing priority distribution chart');
        const ctx = document.getElementById("priorityDistribution").getContext("2d");
        const data = this.statistics?.priorityDistribution || {
            High: 0,
            Medium: 0,
            Low: 0
        };
        console.log('Priority distribution data for chart:', data);

        this.charts.priorityDistribution = new Chart(ctx, {
            type: "pie",
            data: {
                labels: [i18n.t("high"), i18n.t("medium"), i18n.t("low")],
                datasets: [{
                    data: [data.High, data.Medium, data.Low],
                    backgroundColor: ["#EF4444", "#F59E0B", "#10B981"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    initDailyTestCasesChart() {
        const ctx = document.getElementById("dailyTestCasesChart").getContext("2d");
        const data = this.statistics?.testCasesCreation?.daily || [];

        this.charts.dailyTestCasesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: 'Новые тест-кейсы',
                    data: data.map(item => item.count),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initCumulativeTestCasesChart() {
        const ctx = document.getElementById("cumulativeTestCasesChart").getContext("2d");
        const data = this.statistics?.testCasesCreation?.cumulative || [];

        this.charts.cumulativeTestCasesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: 'Всего тест-кейсов',
                    data: data.map(item => item.total),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    initAuthorDistributionChart() {
        const ctx = document.getElementById("authorDistributionChart").getContext("2d");
        const data = this.statistics?.testCasesCreation?.by_author || [];

        this.charts.authorDistributionChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(item => item.author__username),
                datasets: [{
                    data: data.map(item => item.count),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    initTestExecutionChart() {
        const ctx = document.getElementById("testExecutionChart").getContext("2d");
        const data = this.statistics?.testExecution || [];

        this.charts.testExecutionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.date),
                datasets: [
                    {
                        label: 'Успешные',
                        data: data.map(item => item.passed),
                        backgroundColor: 'rgba(75, 192, 192, 0.5)'
                    },
                    {
                        label: 'Неуспешные',
                        data: data.map(item => item.failed),
                        backgroundColor: 'rgba(255, 99, 132, 0.5)'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        stacked: true
                    },
                    x: {
                        stacked: true
                    }
                }
            }
        });
    }

    initAvgExecutionTimeChart() {
        const ctx = document.getElementById("avgExecutionTimeChart").getContext("2d");
        const data = this.statistics?.testExecution || [];

        this.charts.avgExecutionTimeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: 'Среднее время выполнения (сек)',
                    data: data.map(item => item.avg_time),
                    borderColor: 'rgba(153, 102, 255, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async updateCharts() {
        console.log('Updating charts...');
        await this.loadStatistics();
        
        // Обновляем данные в каждом графике
        if (this.charts.testsOverTime) {
            console.log('Updating tests over time chart...');
            const data = this.statistics.testsOverTime;
            this.charts.testsOverTime.data.labels = data.labels;
            this.charts.testsOverTime.data.datasets[0].data = data.success_rate;
            this.charts.testsOverTime.update();
        }

        if (this.charts.resultsDistribution) {
            console.log('Updating results distribution chart...');
            const data = this.statistics.resultsDistribution;
            this.charts.resultsDistribution.data.datasets[0].data = [data.passed, data.failed, data.skipped];
            this.charts.resultsDistribution.update();
        }

        if (this.charts.priorityDistribution) {
            console.log('Updating priority distribution chart...');
            const data = this.statistics.priorityDistribution;
            console.log('New priority distribution data:', data);
            this.charts.priorityDistribution.data.datasets[0].data = [data.High, data.Medium, data.Low];
            this.charts.priorityDistribution.update();
        }

        if (this.charts.dailyTestCasesChart) {
            console.log('Updating daily test cases chart...');
            const data = this.statistics.testCasesCreation.daily;
            this.charts.dailyTestCasesChart.data.labels = data.map(item => item.date);
            this.charts.dailyTestCasesChart.data.datasets[0].data = data.map(item => item.count);
            this.charts.dailyTestCasesChart.update();
        }

        if (this.charts.cumulativeTestCasesChart) {
            console.log('Updating cumulative test cases chart...');
            const data = this.statistics.testCasesCreation.cumulative;
            this.charts.cumulativeTestCasesChart.data.labels = data.map(item => item.date);
            this.charts.cumulativeTestCasesChart.data.datasets[0].data = data.map(item => item.total);
            this.charts.cumulativeTestCasesChart.update();
        }

        if (this.charts.authorDistributionChart) {
            console.log('Updating author distribution chart...');
            const data = this.statistics.testCasesCreation.by_author;
            this.charts.authorDistributionChart.data.labels = data.map(item => item.author__username);
            this.charts.authorDistributionChart.data.datasets[0].data = data.map(item => item.count);
            this.charts.authorDistributionChart.update();
        }

        if (this.charts.testExecutionChart) {
            console.log('Updating test execution chart...');
            const data = this.statistics.testExecution;
            this.charts.testExecutionChart.data.labels = data.map(item => item.date);
            this.charts.testExecutionChart.data.datasets[0].data = data.map(item => item.passed);
            this.charts.testExecutionChart.data.datasets[1].data = data.map(item => item.failed);
            this.charts.testExecutionChart.update();
        }

        if (this.charts.avgExecutionTimeChart) {
            console.log('Updating average execution time chart...');
            const data = this.statistics.testExecution;
            this.charts.avgExecutionTimeChart.data.labels = data.map(item => item.date);
            this.charts.avgExecutionTimeChart.data.datasets[0].data = data.map(item => item.avg_time);
            this.charts.avgExecutionTimeChart.update();
        }
    }
}

// Создаем и экспортируем экземпляр менеджера
window.dashboardManager = new DashboardManager();

// Инициализируем при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const projectId = localStorage.getItem('selectedProject');
    if (projectId) {
        dashboardManager.init();
    } else {
        console.log('No project selected, waiting for selection...');
    }
});

// Обновляем графики при смене проекта
document.getElementById('projectSelector')?.addEventListener('change', function() {
    console.log('Project changed, updating charts...');
    dashboardManager.updateCharts();
});

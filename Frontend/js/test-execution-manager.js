class TestExecutionManager {
    constructor() {
        this.ws = null;
        this.testRunId = null;
        this.startTime = null;
        
        // DOM элементы
        this.executionSection = document.getElementById('testExecutionSection');
        this.browserContainer = document.getElementById('browserTestContainer');
        this.browserWindow = document.getElementById('browserWindow');
        this.testStepProgress = document.getElementById('testStepProgress');
        this.logContent = document.getElementById('logContent');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorDetails = document.getElementById('errorDetails');
        this.testStatus = document.getElementById('testStatus');
        this.testDuration = document.getElementById('testDuration');
    }

    async startTest(testCaseId) {
        try {
            // Запускаем тест через API
            const response = await fetch(`${API_BASE_URL}/projects/${localStorage.getItem('selectedProject')}/test_cases/${testCaseId}/run_test/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.test_run_id) {
                this.testRunId = data.test_run_id;
                this.startTime = new Date();
                this.setupWebSocket();
                this.showExecutionSection();
                
                // Проверяем тип теста и показываем соответствующий контейнер
                if (data.test_type === 'ui') {
                    this.browserContainer.classList.remove('hidden');
                }
            }
        } catch (error) {
            this.showError('Failed to start test execution', error.message);
        }
    }

    setupWebSocket() {
        this.ws = new WebSocket(`ws://${window.location.host}/ws/test_execution/${this.testRunId}/`);
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };

        this.ws.onclose = () => {
            this.addLogMessage('WebSocket connection closed', 'warning');
        };
    }

    handleWebSocketMessage(data) {
        // Обновляем статус
        if (data.status) {
            this.updateStatus(data.status);
        }

        // Обновляем время выполнения
        if (this.startTime) {
            const duration = new Date() - this.startTime;
            this.testDuration.textContent = this.formatDuration(duration);
        }

        // Обрабатываем события
        if (data.event) {
            this.handleTestEvent(data.event);
        }

        // Показываем ошибку если есть
        if (data.error) {
            this.showError('Test Execution Error', data.error);
        }

        // Если тест завершен
        if (data.status === 'completed' || data.status === 'failed') {
            this.handleTestCompletion(data);
        }
    }

    handleTestEvent(event) {
        // Добавляем событие в лог
        this.addLogMessage(event.description, event.severity);

        // Для UI тестов обновляем прогресс
        if (event.type === 'step' && this.browserContainer.classList.contains('block')) {
            this.testStepProgress.textContent = event.description;
            
            // Если есть скриншот, показываем его
            if (event.screenshot) {
                const img = document.createElement('img');
                img.src = event.screenshot;
                img.className = 'w-full h-auto rounded-lg shadow-lg';
                this.browserWindow.innerHTML = '';
                this.browserWindow.appendChild(img);
            }
        }
    }

    handleTestCompletion(data) {
        const status = data.status === 'completed' ? 'success' : 'error';
        this.updateStatus(status);

        if (status === 'error' && data.error) {
            this.showError('Test Failed', data.error);
        }

        // Закрываем WebSocket
        if (this.ws) {
            this.ws.close();
        }
    }

    showExecutionSection() {
        this.executionSection.classList.remove('hidden');
        this.logContent.innerHTML = '';
        this.errorMessage.classList.add('hidden');
        this.updateStatus('running');
    }

    updateStatus(status) {
        this.testStatus.textContent = status.toUpperCase();
        this.testStatus.className = 'px-3 py-1 rounded-full text-sm font-medium';
        
        switch (status) {
            case 'running':
                this.testStatus.classList.add('bg-blue-100', 'text-blue-800', 'dark:bg-blue-900/30', 'dark:text-blue-400');
                break;
            case 'completed':
            case 'success':
                this.testStatus.classList.add('bg-green-100', 'text-green-800', 'dark:bg-green-900/30', 'dark:text-green-400');
                break;
            case 'failed':
            case 'error':
                this.testStatus.classList.add('bg-red-100', 'text-red-800', 'dark:bg-red-900/30', 'dark:text-red-400');
                break;
        }
    }

    addLogMessage(message, severity = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = 'mb-1';
        
        // Добавляем временную метку
        const timestamp = new Date().toLocaleTimeString();
        
        // Выбираем цвет в зависимости от severity
        let color;
        switch (severity) {
            case 'error':
                color = 'text-red-400';
                break;
            case 'warning':
                color = 'text-yellow-400';
                break;
            case 'success':
                color = 'text-green-400';
                break;
            default:
                color = 'text-gray-400';
        }
        
        logEntry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> <span class="${color}">${message}</span>`;
        this.logContent.appendChild(logEntry);
        this.logContent.scrollTop = this.logContent.scrollHeight;
    }

    showError(title, details) {
        this.errorMessage.classList.remove('hidden');
        this.errorMessage.querySelector('.font-bold').textContent = title;
        this.errorDetails.textContent = details;
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Экспортируем для использования в других файлах
window.TestExecutionManager = TestExecutionManager;

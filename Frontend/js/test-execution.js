class TestExecutionManager {
    constructor(testRunId) {
        this.testRunId = testRunId;
        this.ws = null;
        this.statusElement = document.getElementById('test-status');
        this.eventsElement = document.getElementById('test-events');
        this.progressElement = document.getElementById('test-progress');
        this.setupWebSocket();
    }

    async startTest(testCaseId) {
        try {
            // Отправляем запрос на запуск теста
            const response = await fetch(`${API_BASE_URL}/testcases/${testCaseId}/execute/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                }
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('Error response body:', errorBody);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
            }

            const data = await response.json();
            this.testRunId = data.test_run_id;
            this.setupWebSocket();
            return data;

        } catch (error) {
            console.error('Error starting test:', error);
            throw error;
        }
    }

    setupWebSocket() {
        if (this.testRunId) {
            console.log(`Setting up WebSocket for test run ${this.testRunId}`);
            this.ws = new WebSocket(`ws://${window.location.host}/ws/test_execution/${this.testRunId}/`);
            
            this.ws.onopen = () => {
                console.log('WebSocket connection established');
            };

            this.ws.onmessage = (event) => {
                console.log('Received WebSocket message:', event.data);
                
                // Игнорируем встроенное сообщение "connected"
                if (event.data === "connected") {
                    console.log('Received connection confirmation');
                    return;
                }

                try {
                    const message = JSON.parse(event.data);
                    console.log('Parsed WebSocket message:', message);
                    
                    switch (message.type) {
                        case 'status':
                            console.log('Received status update:', message.data);
                            this.updateUI(message.data);
                            break;
                        case 'update':
                            console.log('Received test update:', message.data);
                            this.updateUI(message.data);
                            break;
                        default:
                            console.log('Unknown message type:', message.type);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    console.log('Raw message:', event.data);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket connection closed');
                this.statusElement.textContent = 'Connection lost';
                this.statusElement.className = 'status status-error';
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.statusElement.textContent = 'Connection error';
                this.statusElement.className = 'status status-error';
            };
        }
    }

    updateUI(data) {
        console.log('Updating UI with data:', data);
        // Обновляем статус
        if (data.status) {
            console.log('Updating status:', data.status);
            this.statusElement.textContent = data.status;
            this.statusElement.className = `status status-${data.status}`;
        }

        // Обновляем прогресс для Selenium/Playwright тестов
        if (data.framework && (data.framework === 'selenium' || data.framework === 'playwright')) {
            console.log('Updating progress for', data.framework);
            this.updateProgress(data);
        }

        // Добавляем новое событие
        if (data.events && data.events.length > 0) {
            console.log('Adding events:', data.events);
            data.events.forEach(event => this.addEvent(event));
        }

        // Если тест завершен, показываем итоговый результат
        if (data.status === 'passed' || data.status === 'failed') {
            console.log('Test finished with status:', data.status);
            this.showTestResult(data);
        }
    }

    updateProgress(data) {
        if (data.event && data.event.type === 'step_complete') {
            const progress = document.createElement('div');
            progress.className = 'progress-step';
            progress.innerHTML = `
                <span class="step-name">${data.event.description}</span>
                <span class="step-time">${new Date(data.event.timestamp).toLocaleTimeString()}</span>
            `;
            this.progressElement.appendChild(progress);
        }
    }

    addEvent(event) {
        const eventElement = document.createElement('div');
        eventElement.className = `event event-${event.severity}`;
        eventElement.innerHTML = `
            <span class="event-time">${new Date(event.timestamp).toLocaleTimeString()}</span>
            <span class="event-type">${event.type}</span>
            <span class="event-description">${event.description}</span>
        `;
        this.eventsElement.insertBefore(eventElement, this.eventsElement.firstChild);
    }

    showTestResult(data) {
        const resultElement = document.createElement('div');
        resultElement.className = `test-result test-result-${data.status}`;
        
        let content = `<h3>Test Execution Complete</h3>`;
        content += `<p>Status: ${data.status}</p>`;
        
        if (data.execution_time) {
            content += `<p>Execution Time: ${data.execution_time}</p>`;
        }
        
        if (data.has_error) {
            content += `<div class="error-details">
                <h4>Error Details</h4>
                <pre>${data.events.find(e => e.severity === 'error')?.description || 'No error details available'}</pre>
            </div>`;
        }

        resultElement.innerHTML = content;
        document.getElementById('test-result-container').appendChild(resultElement);
    }
}

// Стили для отображения статуса выполнения теста
const styles = `
    .status { padding: 5px 10px; border-radius: 4px; margin: 10px 0; }
    .status-in_progress { background: #fff3cd; color: #856404; }
    .status-passed { background: #d4edda; color: #155724; }
    .status-failed { background: #f8d7da; color: #721c24; }
    
    .event { padding: 8px; margin: 5px 0; border-left: 4px solid #ddd; }
    .event-info { border-left-color: #17a2b8; }
    .event-error { border-left-color: #dc3545; background: #fff3f3; }
    .event-warning { border-left-color: #ffc107; }
    
    .progress-step { 
        display: flex; 
        justify-content: space-between;
        padding: 5px 10px;
        border-bottom: 1px solid #eee;
    }
    
    .test-result {
        margin: 20px 0;
        padding: 15px;
        border-radius: 4px;
    }
    .test-result-passed { background: #d4edda; }
    .test-result-failed { background: #f8d7da; }
    
    .error-details {
        margin-top: 15px;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 4px;
    }
    .error-details pre {
        margin: 0;
        padding: 10px;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow-x: auto;
    }
`;

// Добавляем стили на страницу
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

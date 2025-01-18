function updateTestRunButton(testCase) {
    const runButton = document.getElementById('runTestButton');
    const statusContainer = document.getElementById('testStatus');
    
    if (!testCase.can_run) {
        runButton.style.display = 'none';
        return;
    }

    runButton.style.display = 'block';
    
    switch (testCase.test_status) {
        case 'no_code':
            runButton.style.display = 'none';
            break;
            
        case 'not_found':
            runButton.classList.add('bg-gray-500');
            runButton.onclick = () => {
                showNotification('Test not found in repository', 'error');
            };
            break;
            
        case 'modified':
            // Показываем предупреждение и кнопку обновления
            statusContainer.innerHTML = `
                <div class="flex items-center space-x-2 text-yellow-600">
                    <span>Test code is different from repository</span>
                    <button onclick="updateTestCode(${testCase.id})" 
                            class="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded">
                        Update Code
                    </button>
                </div>
            `;
            runButton.onclick = () => runTest(testCase.id);
            break;
            
        case 'synced':
            runButton.classList.add('bg-coral-500');
            runButton.onclick = () => runTest(testCase.id);
            break;
    }
}

async function updateTestCode(testCaseId) {
    try {
        const response = await fetch(`/api/testcases/${testCaseId}/update_code/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            }
        });

        if (!response.ok) throw new Error('Failed to update test code');

        const updatedTestCase = await response.json();
        showNotification('Test code updated successfully', 'success');
        
        // Обновляем отображение тест-кейса
        renderTestCase(updatedTestCase);
    } catch (error) {
        console.error('Error updating test code:', error);
        showNotification('Failed to update test code', 'error');
    }
}

async function runTest(testCaseId) {
    try {
        const response = await fetch(`/api/testcases/${testCaseId}/run/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            }
        });

        const result = await response.json();
        
        if (response.ok) {
            if (result.success) {
                showNotification('Test executed successfully', 'success');
                // Показываем результаты теста
                showTestResults(result.output);
            } else {
                showNotification(result.error || 'Test execution failed', 'error');
            }
        } else {
            if (result.error === 'Test not found in repository') {
                showNotification('This test is not found in the repository', 'error');
            } else {
                showNotification(result.error || 'Failed to run test', 'error');
            }
        }
    } catch (error) {
        console.error('Error running test:', error);
        showNotification('Failed to run test', 'error');
    }
}

// Глобальный объект для работы с тест-кейсами
window.testCases = {
    current: null,
    isEditing: false,

    // Загрузка тест-кейса
    async load() {
        // Получаем id тест-кейса из URL
        const urlParams = new URLSearchParams(window.location.search);
        const testCaseId = urlParams.get('id');
        if (testCaseId) {
            await this.loadTestCase(testCaseId);
        }
    },

    // Загрузка данных тест-кейса
    async loadTestCase(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/testcases/${id}/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                }
            });
            if (!response.ok) throw new Error('Failed to load test case');
            
            const testCase = await response.json();
            console.log('Loaded test case:', testCase);
            this.updateTestCaseInfo(testCase);
        } catch (error) {
            console.error('Error loading test case:', error);
            showNotification('Failed to load test case', 'error');
        }
    },

    // Обновление информации о тест-кейсе
    updateTestCaseInfo(testCase) {
        if (!testCase) return;
        this.current = testCase;

        // Обновляем заголовок
        const titleInput = document.querySelector('input[type="text"]');
        if (titleInput) titleInput.value = testCase.title || '';

        // Обновляем описание
        const description = document.getElementById('description');
        if (description) description.value = testCase.description || '';

        // Обновляем код теста
        const testCode = document.getElementById('testCode');
        if (testCode) {
            testCode.textContent = testCase.test_code || '# No test code available';
            // Если Prism.js подключен, подсвечиваем синтаксис
            if (window.Prism) {
                testCode.className = 'language-python';
                Prism.highlightElement(testCode);
            }
        }

        // Обновляем даты
        const dates = document.querySelectorAll('.text-gray-500.dark\\:text-gray-400');
        if (dates.length >= 2) {
            dates[0].textContent = `Created: ${new Date(testCase.created_at).toLocaleString()}`;
            dates[1].textContent = `Last Modified: ${new Date(testCase.updated_at).toLocaleString()}`;
        }

        // Обновляем кнопки
        const editBtn = document.getElementById('editBtn');
        if (editBtn) editBtn.disabled = false;

        const runTestBtn = document.getElementById('runTestBtn');
        if (runTestBtn) {
            runTestBtn.disabled = testCase.test_type !== 'automated';
            if (testCase.test_type !== 'automated') {
                runTestBtn.title = 'This test case is not automated';
            } else {
                runTestBtn.title = 'Run this test';
            }
        }
    },

    // Копирование кода
    copyCode() {
        const testCode = document.getElementById('testCode');
        if (testCode) {
            navigator.clipboard.writeText(testCode.textContent)
                .then(() => showNotification('Code copied to clipboard', 'success'))
                .catch(err => {
                    console.error('Failed to copy code:', err);
                    showNotification('Failed to copy code', 'error');
                });
        }
    },

    // Запуск теста
    async runTest() {
        if (!this.current || !this.current.id) {
            showNotification('No test case selected', 'error');
            return;
        }

        if (this.current.test_type !== 'automated') {
            showNotification('This test case is not automated', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/testcases/${this.current.id}/run/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                }
            });

            const result = await response.json();
            
            if (response.ok) {
                if (result.success) {
                    showNotification('Test execution started', 'success');
                } else {
                    showNotification(result.error || 'Failed to start test execution', 'error');
                }
            } else {
                showNotification(result.error || 'Failed to start test execution', 'error');
            }
        } catch (error) {
            console.error('Error running test:', error);
            showNotification('Failed to start test execution', 'error');
        }
    }
};
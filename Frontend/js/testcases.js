// Глобальный объект для работы с тест-кейсами
console.log('Initializing testcases.js');

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

window.testCaseManager = {
    current: null,
    isEditing: false,
    originalValues: {
        description: '',
        conditions: '',
        steps: [],
        results: [],
        priority: '',
        platform: '',
        testType: '',
        title: ''
    },

    // Инициализация
    async init() {
        // Добавляем обработчики событий для кнопок
        document.getElementById('editButton')?.addEventListener('click', () => this.enableEditMode());
        document.getElementById('saveButton')?.addEventListener('click', () => this.saveChanges());
        document.getElementById('cancelButton')?.addEventListener('click', () => this.cancelEdit());
        document.getElementById('deleteButton')?.addEventListener('click', () => this.deleteTestCase());
        document.getElementById('runTestButton')?.addEventListener('click', () => this.runTest());
        
        // Загружаем тест-кейсы
        await this.loadTestCases();
    },

    // Загрузка тест-кейсов
    async loadTestCases() {
        await this.fetchFoldersAndTestCases();
    },

    // Загрузка папок и тест-кейсов
    async fetchFoldersAndTestCases() {
        const selectedProjectId = localStorage.getItem('selectedProject');
        console.log('Selected project ID:', selectedProjectId);
        
        if (!selectedProjectId) {
            console.error('No project selected');
            const folderTree = document.getElementById('folderTree');
            if (folderTree) {
                folderTree.innerHTML = '<div class="text-gray-500 text-center p-4">Please select a project first</div>';
            }
            return;
        }

        const folderTree = document.getElementById('folderTree');
        if (!folderTree) {
            console.error('Folder tree container not found');
            return;
        }
        folderTree.innerHTML = '<div class="text-gray-500 text-center p-4">Loading...</div>';

        try {
            console.log('Fetching folders and test cases...');
            
            // Получаем папки проекта
            const foldersResponse = await fetchWithAuth(`${API_BASE_URL}/folders/?project=${selectedProjectId}`);
            if (!foldersResponse.ok) {
                throw new Error('Failed to fetch folders');
            }
            const foldersData = await foldersResponse.json();
            console.log('Project folders:', foldersData);

            // Получаем тест-кейсы проекта
            console.log('Sending request to testcases API...');
            const testCasesResponse = await fetchWithAuth(`${API_BASE_URL}/testcases/?project=${selectedProjectId}`);
            console.log('Test cases response:', testCasesResponse);
            if (!testCasesResponse.ok) {
                const errorText = await testCasesResponse.text();
                console.error('Test cases error:', errorText);
                throw new Error('Failed to fetch test cases');
            }
            const allTestCases = await testCasesResponse.json();
            console.log('All test cases:', allTestCases);

            // Фильтруем тест-кейсы для папок текущего проекта
            const projectTestCases = allTestCases.filter(testCase => {
                console.log('Processing test case:', testCase);
                const match = foldersData.some(folder => {
                    const isMatch = testCase.folder === folder.id;
                    console.log(`Checking if test case ${testCase.id} belongs to folder ${folder.id}:`, isMatch);
                    return isMatch;
                });
                return match;
            });
            console.log('Project test cases:', projectTestCases);

            this.updateFolderTree(foldersData, projectTestCases);

        } catch (error) {
            console.error('Error fetching data:', error);
            folderTree.innerHTML = '<div class="text-red-500 text-center p-4">Error loading data. Please try again.</div>';
        }
    },

    // Обновление дерева папок
    updateFolderTree(folders, testcases) {
        console.log('Updating folder tree with:', { folders, testcases });
        const folderTree = document.getElementById('folderTree');
        if (!folderTree) return;

        folderTree.innerHTML = '';

        folders.forEach(folder => {
            const { folderElement, testCasesContainer } = this.createFolderElement(folder);
            
            // Находим тест-кейсы для текущей папки
            const folderTestCases = testcases.filter(tc => {
                const isMatch = tc.folder === folder.id;
                console.log(`Checking if test case ${tc.id} belongs to folder ${folder.id}:`, {
                    testCase: tc,
                    folderId: tc.folder,
                    match: isMatch
                });
                return isMatch;
            });
            console.log(`Test cases for folder ${folder.name} (id: ${folder.id}):`, folderTestCases);

            if (folderTestCases.length > 0) {
                folderTestCases.forEach(testCase => {
                    const testCaseElement = this.createTestCaseElement(testCase);
                    testCasesContainer.appendChild(testCaseElement);
                });
            }

            folderTree.appendChild(folderElement);
        });
    },

    // Создание элемента папки
    createFolderElement(folder) {
        const folderElement = document.createElement('div');
        folderElement.className = 'folder-item mb-2';
        folderElement.setAttribute('data-id', folder.id);

        const header = document.createElement('div');
        header.className = 'flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer';

        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'w-4 h-4 flex items-center justify-center mr-2';

        const toggleIcon = document.createElement('i');
        toggleIcon.className = 'fas fa-chevron-right text-gray-400 transform transition-transform duration-200';
        toggleWrapper.appendChild(toggleIcon);

        const folderIcon = document.createElement('i');
        folderIcon.className = 'fas fa-folder text-yellow-500 mr-2';

        const title = document.createElement('span');
        title.textContent = folder.name;
        title.className = 'text-sm text-gray-700 dark:text-gray-300';

        header.appendChild(toggleWrapper);
        header.appendChild(folderIcon);
        header.appendChild(title);
        folderElement.appendChild(header);

        // Контейнер для тест-кейсов
        const testCasesContainer = document.createElement('div');
        testCasesContainer.className = 'pl-8 hidden';
        folderElement.appendChild(testCasesContainer);

        // Добавляем обработчик для сворачивания/разворачивания
        header.addEventListener('click', () => {
            testCasesContainer.classList.toggle('hidden');
            toggleIcon.classList.toggle('rotate-90');
        });

        // Добавляем контекстное меню для папки
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, [
                {
                    label: 'Создать тест-кейс',
                    icon: 'fa-plus',
                    action: () => this.createTestCase(folder.id)
                },
                {
                    label: 'Создать подпапку',
                    icon: 'fa-folder-plus',
                    action: () => this.createFolder(folder.id)
                },
                {
                    label: 'Переименовать',
                    icon: 'fa-edit',
                    action: () => this.renameFolder(folder.id)
                },
                {
                    label: 'Удалить',
                    icon: 'fa-trash',
                    action: () => this.deleteFolder(folder.id),
                    class: 'text-red-500'
                }
            ]);
        });

        return { folderElement, testCasesContainer };
    },

    // Создание элемента тест-кейса
    createTestCaseElement(testCase) {
        console.log('Creating test case element:', testCase);
        const testCaseItem = document.createElement('div');
        testCaseItem.className = 'test-case-item group my-1';
        testCaseItem.setAttribute('data-id', testCase.id);

        const content = document.createElement('div');
        content.className = 'flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer';

        const icon = document.createElement('i');
        icon.className = 'fas fa-file-alt text-blue-500 mr-2';

        const title = document.createElement('span');
        title.textContent = testCase.title;
        title.className = 'text-sm text-gray-700 dark:text-gray-300';

        content.appendChild(icon);
        content.appendChild(title);
        testCaseItem.appendChild(content);

        // Добавляем обработчик клика для просмотра тест-кейса
        content.addEventListener('click', () => this.show(testCase.id));

        // Добавляем контекстное меню
        testCaseItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, [
                {
                    label: 'Редактировать',
                    icon: 'fa-edit',
                    action: () => this.edit(testCase.id)
                },
                {
                    label: 'Дублировать',
                    icon: 'fa-copy',
                    action: () => this.duplicate(testCase.id)
                },
                {
                    label: 'Удалить',
                    icon: 'fa-trash',
                    action: () => this.delete(testCase.id),
                    class: 'text-red-500'
                }
            ]);
        });

        return testCaseItem;
    },

    // Показать детали тест-кейса
    async show(id) {
        console.log('Showing test case:', id);
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/testcases/${id}/`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const testcase = await response.json();
            console.log('Test case data:', testcase);
            console.log('Test code:', testcase.test_code);

            // Получаем контейнер для информации о тест-кейсе
            const testCaseInfo = document.getElementById('testCaseInfo');
            testCaseInfo.innerHTML = `
                <div class="h-full w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div class="p-8 h-full overflow-y-auto">
                        <div class="flex justify-between mb-4 text-sm text-gray-500">
                            <span>Created: ${new Date(testcase.created_at).toLocaleDateString()}</span>
                            <span>Last Modified: ${new Date(testcase.updated_at).toLocaleDateString()}</span>
                        </div>
                        
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center space-x-4 flex-grow">
                                <input type="text" id="testCaseTitle" class="text-2xl font-bold text-gray-800 border-b-2 border-transparent focus:border-blue-500 focus:outline-none bg-transparent" value="${testcase.title || ''}" readonly>
                            </div>
                            <div class="flex space-x-3">
                                <button id="editBtn" class="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200" onclick="testCaseManager.enableEditMode()">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                </button>
                                <button class="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-6 mb-6">
                            <div class="grid grid-cols-1 gap-4">
                                <div class="space-y-2">
                                    <label class="text-sm font-medium text-gray-700">Platform</label>
                                    <select id="platform" class="w-full p-2 rounded-lg border-gray-200 focus:ring-2 focus:ring-blue-200 focus:outline-none" disabled>
                                        <option value="web" class="bg-purple-50 text-purple-600" ${testcase.platform === 'web' ? 'selected' : ''}>Web Application</option>
                                        <option value="android" class="bg-green-50 text-green-600" ${testcase.platform === 'android' ? 'selected' : ''}>Android</option>
                                        <option value="ios" class="bg-blue-50 text-blue-600" ${testcase.platform === 'ios' ? 'selected' : ''}>iOS</option>
                                        <option value="desktop" class="bg-orange-50 text-orange-600" ${testcase.platform === 'desktop' ? 'selected' : ''}>Desktop</option>
                                    </select>
                                </div>
                                <div class="space-y-2">
                                    <label class="text-sm font-medium text-gray-700">Priority</label>
                                    <select id="priority" class="w-full p-2 rounded-lg border-gray-200 focus:ring-2 focus:ring-blue-200 focus:outline-none" disabled>
                                        <option value="high" class="bg-red-50 text-red-600" ${testcase.priority === 'high' ? 'selected' : ''}>High Priority</option>
                                        <option value="medium" class="bg-yellow-50 text-yellow-600" ${testcase.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
                                        <option value="low" class="bg-green-50 text-green-600" ${testcase.priority === 'low' ? 'selected' : ''}>Low Priority</option>
                                    </select>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 gap-4">
                                <div class="space-y-2">
                                    <label class="text-sm font-medium text-gray-700">Estimated Time (minutes)</label>
                                    <input type="number" id="estimatedTime" class="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:outline-none" value="${testcase.estimated_time || 30}" readonly>
                                </div>
                                <div class="space-y-2">
                                    <label class="text-sm font-medium text-gray-700">Status</label>
                                    <select id="testType" class="w-full p-2 rounded-lg border-gray-200 focus:ring-2 focus:ring-blue-200 focus:outline-none" disabled>
                                        <option value="automated" class="bg-blue-50 text-blue-600" ${testcase.test_type === 'automated' ? 'selected' : ''}>Automated</option>
                                        <option value="manual" class="bg-gray-50 text-gray-600" ${testcase.test_type === 'manual' ? 'selected' : ''}>Manual</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="mb-6">
                            <label class="text-sm font-medium text-gray-700 mb-2 block">Tags</label>
                            <div class="flex flex-wrap gap-2" id="tagsContainer">
                                ${(testcase.tags || []).map(tag => `
                                    <span class="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">${tag}</span>
                                `).join('')}
                                <button class="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-gray-200" disabled>+ Add Tag</button>
                            </div>
                        </div>

                        <div class="mb-6 bg-gray-50 rounded-lg p-4">
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="font-semibold text-gray-700">Description</h3>
                                <button class="text-blue-600 hover:text-blue-800 text-sm font-medium" onclick="document.getElementById('fullDescription').classList.toggle('hidden')">
                                    Show More
                                </button>
                            </div>
                            <textarea id="description" class="w-full p-3 bg-white rounded-lg shadow-inner border-0 focus:ring-2 focus:ring-blue-200" rows="2" readonly>${testcase.description || ''}</textarea>
                        </div>

                        <div class="mb-6 bg-gray-50 rounded-lg p-4">
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="font-semibold text-gray-700">Code</h3>
                                <div class="flex space-x-2">
                                    <select class="text-sm border border-gray-200 rounded-md px-2 py-1" disabled>
                                        <option>Python</option>
                                        <option>JavaScript</option>
                                        <option>Java</option>
                                        <option>C#</option>
                                    </select>
                                    <button class="text-blue-600 hover:text-blue-800 text-sm font-medium" onclick="testCaseManager.copyCode()">Copy</button>
                                </div>
                            </div>
                            <div class="bg-gray-900 rounded-lg p-4 font-mono">
                                <pre id="testCode" class="text-green-400 text-sm overflow-x-auto whitespace-pre-wrap"><code>${testcase.test_code || '# No test code available'}</code></pre>
                            </div>
                        </div>

                        <div class="mb-6">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="font-semibold text-gray-700">Steps and Expected Results</h3>
                                <button class="px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200" onclick="testCaseManager.addStep()" id="addStepButton" disabled>
                                    Add Step
                                </button>
                            </div>
                            <div class="space-y-4" id="stepsContainer">
                                ${(testcase.steps || []).map((step, index) => `
                                    <div class="bg-white p-4 rounded-lg shadow border border-gray-100" id="step-${index + 1}" draggable="true">
                                        <div class="flex justify-between items-start mb-3">
                                            <span class="font-medium text-gray-700">Step ${index + 1}</span>
                                            <button onclick="testCaseManager.removeStep(${index + 1})" class="text-red-500 hover:text-red-700">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div class="flex gap-4">
                                            <textarea class="w-1/2 p-2 border border-gray-200 rounded-lg" placeholder="Enter step description" readonly>${step.description || ''}</textarea>
                                            <textarea class="w-1/2 p-2 border border-gray-200 rounded-lg" placeholder="Expected result" readonly>${step.expected_result || ''}</textarea>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="border-t pt-6">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-4">
                                    <span class="px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-50 to-green-100 text-green-600">Last Run: ${testcase.last_run_status || 'Not Run'}</span>
                                    <span class="text-sm text-gray-500">${testcase.last_run_time ? '2 hours ago' : 'Never'}</span>
                                </div>
                                <div class="space-x-3">
                                    <button id="saveButton" onclick="testCaseManager.saveChanges()" class="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transform transition hover:scale-105 shadow-md hidden">
                                        Save Changes
                                    </button>
                                    <button onclick="testCaseManager.runTest()" class="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transform transition hover:scale-105 shadow-md">
                                        Run Test
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Показываем панель с информацией и скрываем пустое состояние
            testCaseInfo.classList.remove('hidden');
            const emptyState = document.getElementById('emptyState');
            if (emptyState) {
                emptyState.classList.add('hidden');
            }

            // Сохраняем текущий тест-кейс
            this.current = testcase;

            // Инициализируем сортировку для шагов
            if (window.Sortable) {
                new Sortable(document.getElementById('stepsContainer'), {
                    animation: 150,
                    handle: '.font-medium',
                    ghostClass: 'bg-gray-100'
                });
            }

        } catch (error) {
            console.error('Error fetching test case:', error);
            showNotification('Failed to load test case', 'error');
        }
    },

    // Обновление информации о тест-кейсе
    updateTestCaseInfo(testCase) {
        if (!testCase) return;
        
        // Сохраняем текущий тест-кейс
        this.current = testCase;
        
        console.log('Updating test case info:', testCase);

        // Обновляем основные поля
        document.getElementById('testCaseId').textContent = testCase.id;
        document.getElementById('testCaseTitle').value = testCase.title || '';
        
        // Логируем значения перед установкой
        console.log('Platform value:', testCase.platform);
        console.log('Priority value:', testCase.priority);
        console.log('Test type value:', testCase.test_type);
        
        document.getElementById('platform').value = testCase.platform || '';
        document.getElementById('priority').value = testCase.priority || '';
        document.getElementById('testType').value = testCase.test_type || '';
        document.getElementById('estimatedTime').value = testCase.estimated_time || 30;
        document.getElementById('description').value = testCase.description || '';

        // Обновляем код теста с подсветкой синтаксиса
        const testCodeElement = document.getElementById('testCode');
        if (testCodeElement) {
            console.log('Found testCode element');
            const code = testCase.test_code || '# No test code available';
            console.log('Code to display:', code);
            testCodeElement.textContent = code;
            testCodeElement.className = 'language-python';
            console.log('Before highlighting');
            Prism.highlightElement(testCodeElement);
            console.log('After highlighting');
        } else {
            console.error('testCode element not found');
        }

        // Обновляем даты
        const createdDate = testCase.created_at ? new Date(testCase.created_at).toLocaleString() : '-';
        const modifiedDate = testCase.updated_at ? new Date(testCase.updated_at).toLocaleString() : '-';
        document.getElementById('createdDate').textContent = createdDate;
        document.getElementById('modifiedDate').textContent = modifiedDate;

        // Очищаем и обновляем теги
        const tagsContainer = document.getElementById('tagsContainer');
        tagsContainer.innerHTML = '';
        if (testCase.tags && testCase.tags.length > 0) {
            testCase.tags.forEach(tag => {
                const tagElement = document.createElement('div');
                tagElement.className = 'px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center';
                tagElement.innerHTML = `
                    <span>${tag}</span>
                    <button onclick="testCaseManager.removeTag(this)" class="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                tagsContainer.appendChild(tagElement);
            });
        }

        // Очищаем и обновляем шаги
        const stepsContainer = document.getElementById('stepsContainer');
        stepsContainer.innerHTML = '';
        if (testCase.steps) {
            let steps;
            try {
                steps = typeof testCase.steps === 'string' ? JSON.parse(testCase.steps) : testCase.steps;
            } catch (e) {
                console.error('Error parsing steps:', e);
                steps = [];
            }

            steps.forEach((step, index) => {
                const stepElement = document.createElement('div');
                stepElement.className = 'p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700';
                stepElement.dataset.stepId = step.id || '';
                stepElement.innerHTML = `
                    <div class="flex justify-between items-start mb-3">
                        <h4 class="font-medium text-gray-700 dark:text-gray-300">Step ${index + 1}</h4>
                        <button onclick="testCaseManager.removeStep(this)" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea class="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100" rows="3" disabled>${step.description || ''}</textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Result</label>
                            <textarea class="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100" rows="3" disabled>${step.expected_result || ''}</textarea>
                        </div>
                    </div>
                `;
                stepsContainer.appendChild(stepElement);
            });
        }

        // Обновляем состояние кнопки запуска теста
        const runTestButton = document.getElementById('runTestButton');
        if (runTestButton) {
            runTestButton.disabled = testCase.test_type !== 'automated';
            if (testCase.test_type !== 'automated') {
                runTestButton.title = 'This test case is not automated';
            } else {
                runTestButton.title = 'Run this test case';
            }
        }

        // Сохраняем оригинальные значения для отмены изменений
        this.originalValues = {
            title: testCase.title || '',
            description: testCase.description || '',
            platform: testCase.platform || '',
            priority: testCase.priority || '',
            testType: testCase.test_type || '',
            estimatedTime: testCase.estimated_time || 30,
            steps: testCase.steps || [],
            tags: testCase.tags || []
        };

        // Показываем панель с информацией
        document.getElementById('testCaseInfo').classList.remove('hidden');
        document.getElementById('emptyState').classList.add('hidden');
    },

    // Добавление тега
    addTag() {
        const input = document.getElementById('addTagInput');
        const tag = input.value.trim();
        
        if (tag) {
            const tagsContainer = document.getElementById('tagsContainer');
            const tagElement = document.createElement('div');
            tagElement.className = 'px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center';
            tagElement.innerHTML = `
                <span>${tag}</span>
                <button onclick="testCaseManager.removeTag(this)" class="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            `;
            tagsContainer.appendChild(tagElement);
            input.value = '';
        }
    },

    // Удаление тега
    removeTag(button) {
        button.closest('div').remove();
    },

    // Добавление шага
    addStep() {
        const stepsContainer = document.getElementById('stepsContainer');
        const stepNumber = stepsContainer.children.length + 1;
        
        const stepElement = document.createElement('div');
        stepElement.className = 'p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700';
        stepElement.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium text-gray-700 dark:text-gray-300">Step ${stepNumber}</h4>
                <button onclick="testCaseManager.removeStep(this)" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea class="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100" rows="3"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Result</label>
                    <textarea class="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100" rows="3"></textarea>
                </div>
            </div>
        `;
        stepsContainer.appendChild(stepElement);
    },

    // Удаление шага
    removeStep(button) {
        button.closest('.p-4').remove();
        // Обновляем нумерацию шагов
        const steps = document.querySelectorAll('#stepsContainer > div');
        steps.forEach((step, index) => {
            const stepTitle = step.querySelector('h4');
            stepTitle.textContent = `Step ${index + 1}`;
        });
    },

    // Включение режима редактирования
    enableEditMode() {
        // Включаем все поля для редактирования
        const fieldsToEnable = [
            'testCaseTitle',
            'platform',
            'priority',
            'testType',
            'estimatedTime',
            'description',
            'addTagInput',
            'testCode'
        ];

        fieldsToEnable.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.removeAttribute('disabled');
                element.removeAttribute('readonly');
            }
        });

        // Включаем редактирование существующих шагов
        const stepsContainer = document.getElementById('stepsContainer');
        if (stepsContainer) {
            const stepInputs = stepsContainer.querySelectorAll('textarea');
            stepInputs.forEach(input => {
                input.removeAttribute('disabled');
                input.removeAttribute('readonly');
            });
        }

        // Показываем кнопки для добавления тегов и шагов
        const actionButtons = document.querySelectorAll('.edit-action-button');
        actionButtons.forEach(button => button.classList.remove('hidden'));

        // Скрываем кнопку Edit и показываем Save/Cancel
        document.getElementById('editButton').classList.add('hidden');
        document.getElementById('saveButton').classList.remove('hidden');
        document.getElementById('cancelButton').classList.remove('hidden');
    },

    // Сохранение изменений
    async saveChanges() {
        const platformValue = document.getElementById('platform').value;
        const priorityValue = document.getElementById('priority').value;

        // Проверяем обязательные поля
        if (!platformValue) {
            showNotification('Platform is required', 'error');
            return;
        }
        if (!priorityValue) {
            showNotification('Priority is required', 'error');
            return;
        }

        // Собираем основные данные
        const updatedTestCase = {
            id: this.current.id,
            title: document.getElementById('testCaseTitle').value,
            platform: platformValue,
            priority: priorityValue,
            test_type: document.getElementById('testType').value || '',
            estimated_time: parseInt(document.getElementById('estimatedTime').value) || 30,
            description: document.getElementById('description').value || '',
            code: document.getElementById('testCode').value || '',
        };

        // Собираем теги
        const tagElements = document.querySelectorAll('#tagsContainer > div');
        updatedTestCase.tags = Array.from(tagElements).map(tagEl => 
            tagEl.querySelector('span').textContent.trim()
        );

        // Собираем шаги в строку JSON
        const stepElements = document.querySelectorAll('#stepsContainer > div');
        const steps = Array.from(stepElements).map((stepEl, index) => {
            const textareas = stepEl.querySelectorAll('textarea');
            return {
                id: stepEl.dataset.stepId || null,
                order: index + 1,
                description: textareas[0].value.trim() || '',
                expected_result: textareas[1].value.trim() || ''
            };
        }).filter(step => step.description || step.expected_result);

        updatedTestCase.steps = JSON.stringify(steps);

        try {
            console.log('Sending data:', updatedTestCase);

            // Отправляем запрос на обновление
            const response = await fetchWithAuth(`${API_BASE_URL}/testcases/${this.current.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedTestCase)
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('Server error:', responseData);
                const errorMessage = this.formatErrorMessage(responseData);
                throw new Error(errorMessage);
            }

            this.current = responseData;

            // Отключаем режим редактирования
            this.disableEditMode();

            // Обновляем отображение
            await this.loadTestCases();
            
            // Показываем уведомление об успехе
            showNotification('Test case updated successfully', 'success');
        } catch (error) {
            console.error('Error updating test case:', error);
            showNotification(error.message || 'Failed to update test case', 'error');
        }
    },

    // Форматирование сообщения об ошибке
    formatErrorMessage(errorData) {
        if (!errorData) return 'Unknown error occurred';

        const messages = [];
        for (const [field, errors] of Object.entries(errorData)) {
            if (Array.isArray(errors)) {
                messages.push(`${field}: ${errors.join(', ')}`);
            }
        }
        return messages.length > 0 ? messages.join('\n') : 'Failed to update test case';
    },

    // Отключение режима редактирования
    disableEditMode() {
        // Отключаем все поля редактирования
        const fieldsToDisable = [
            'testCaseTitle',
            'platform',
            'priority',
            'testType',
            'estimatedTime',
            'description',
            'addTagInput',
            'testCode'
        ];

        fieldsToDisable.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.setAttribute('disabled', 'disabled');
                if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
                    element.setAttribute('readonly', 'readonly');
                }
            }
        });

        // Отключаем редактирование существующих шагов
        const stepsContainer = document.getElementById('stepsContainer');
        if (stepsContainer) {
            const stepInputs = stepsContainer.querySelectorAll('textarea');
            stepInputs.forEach(input => {
                input.setAttribute('disabled', 'disabled');
                input.setAttribute('readonly', 'readonly');
            });
        }

        // Скрываем кнопки для добавления тегов и шагов
        const actionButtons = document.querySelectorAll('.edit-action-button');
        actionButtons.forEach(button => button.classList.add('hidden'));

        // Показываем кнопку Edit и скрываем Save/Cancel
        document.getElementById('editButton').classList.remove('hidden');
        document.getElementById('saveButton').classList.add('hidden');
        document.getElementById('cancelButton').classList.add('hidden');
    },

    // Отмена редактирования
    cancelEdit() {
        this.disableEditMode();
        // Восстанавливаем предыдущие значения
        this.updateTestCaseInfo(this.current);
    },

    // Запуск теста
    async runTest() {
        if (!this.current || !this.current.id) {
            showNotification('No test case selected', 'error');
            return;
        }

        // Создаем менеджер выполнения тестов если еще не создан
        if (!window.testExecutionManager) {
            window.testExecutionManager = new TestExecutionManager();
        }

        try {
            // Запускаем тест
            await window.testExecutionManager.startTest(this.current.id);
            showNotification('Test execution started', 'success');
        } catch (error) {
            console.error('Error running test:', error);
            showNotification('Failed to start test execution', 'error');
        }
    },

    // Копирование кода
    copyCode() {
        const testCodeElement = document.getElementById('testCode');
        if (testCodeElement) {
            const code = testCodeElement.textContent;
            navigator.clipboard.writeText(code).then(() => {
                showNotification('Code copied to clipboard', 'success');
            }).catch(err => {
                console.error('Failed to copy code:', err);
                showNotification('Failed to copy code', 'error');
            });
        }
    },

    // Остальные методы без изменений...
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing test cases...');
    window.testCaseManager.init();
});

// Добавляем обработчик для синхронизации между страницами
window.addEventListener('storage', function(e) {
    if (e.key === 'selectedProject') {
        window.testCaseManager.loadTestCases();
    }
});

let testExecutionManager = null;
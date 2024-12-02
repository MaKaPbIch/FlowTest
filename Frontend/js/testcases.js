// Global variables
let isEditing = false;
let originalValues = {
    description: '',
    conditions: '',
    steps: [],
    results: [],
    priority: '',
    platform: '',
    testType: '',
    title: ''
};

async function showTestCaseInfo(element) {
    const testCaseId = element.getAttribute('data-id');
    const testCaseInfoContainer = document.getElementById('testCaseInfoContainer');
    
    if (!testCaseInfoContainer) {
        console.error('Test case info container not found');
        return;
    }

    try {
        if (testCaseInfoContainer.children.length === 0) {
            const template = document.getElementById('testCaseTemplate');
            if (template) {
                const templateContent = template.cloneNode(true);
                templateContent.classList.remove('hidden');
                testCaseInfoContainer.appendChild(templateContent);
            } else {
                console.error('Template not found');
                return;
            }
        }

        const response = await fetchWithAuth(`http://127.0.0.1:8000/api/testcases/${testCaseId}/`);
        const testCase = await response.json();
        console.log('Test case data:', testCase);
        console.log('Priority:', testCase.priority);
        console.log('Platform:', testCase.platform);

        const updateElement = (id, value, property = 'textContent') => {
            const element = document.getElementById(id);
            if (element) {
                element[property] = value;
            }
        };

        const updateElementStyle = (id, style, value) => {
            const element = document.getElementById(id);
            if (element && element.style) {
                element.style[style] = value;
            }
        };

        const createdDate = new Date(testCase.created_at).toLocaleString();
        const updatedDate = new Date(testCase.updated_at).toLocaleString();

        updateElement('testTitle', testCase.title);
        updateElement('testDescription', testCase.description);
        updateElement('createdDate', `Created: ${createdDate}`);
        updateElement('updatedDate', `Last Edited: ${updatedDate}`);

        const prioritySelect = document.getElementById('prioritySelect');
        if (prioritySelect) {
            if (!testCase.priority || testCase.priority === 'null' || testCase.priority === null) {
                prioritySelect.value = '';
                prioritySelect.className = 'bg-gray-100 text-gray-500 text-sm font-medium px-3 py-1 rounded-full border border-gray-200';
            } else {
                prioritySelect.value = testCase.priority === 'Высокий' ? 'high' : 
                                     testCase.priority === 'Средний' ? 'medium' : 'low';
                prioritySelect.className = 'bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full';
            }
        }

        const platformSelect = document.getElementById('platformSelect');
        if (platformSelect) {
            if (!testCase.platform || testCase.platform === 'null' || testCase.platform === null) {
                platformSelect.value = '';
                platformSelect.className = 'bg-gray-100 text-gray-500 text-sm font-medium px-3 py-1 rounded-full border border-gray-200';
            } else {
                platformSelect.value = testCase.platform === 'Web' ? 'chrome' :
                                     testCase.platform === 'Mobile' ? 'mobile' :
                                     testCase.platform === 'Desktop' ? 'desktop' :
                                     testCase.platform === 'Any' ? 'any' : 'any';
                platformSelect.className = platformSelect.value === 'any' ? 
                    'bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full' :
                    'bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full';
            }
        }

        const conditionsContent = document.getElementById('conditionsContent');
        if (conditionsContent && testCase.condition) {
            const conditions = testCase.condition.split('\n').filter(c => c.trim());
            conditionsContent.innerHTML = conditions.map(condition => 
                `<li class="text-gray-600">${condition}</li>`
            ).join('');
        }

        testCaseInfoContainer.classList.remove('hidden');

    } catch (error) {
        console.error('Error fetching test case data:', error);
        showMessage('Error loading test case information', 'error');
    }
}

// Вызываем fetchFoldersAndTestCases при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    fetchFoldersAndTestCases();
});

// Добавляем обработчик для синхронизации между страницами
window.addEventListener('storage', function(e) {
    if (e.key === 'selectedProjectId') {
        fetchFoldersAndTestCases();
    }
});

async function fetchFoldersAndTestCases() {
    const selectedProjectId = localStorage.getItem('selectedProjectId');
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
        const [foldersResponse, testCasesResponse] = await Promise.all([
            fetchWithAuth(`http://127.0.0.1:8000/api/folders/`),
            fetchWithAuth(`http://127.0.0.1:8000/api/testcases/`)
        ]);

        if (!foldersResponse.ok || !testCasesResponse.ok) {
            throw new Error('Failed to fetch data');
        }

        const foldersData = await foldersResponse.json();
        const testCasesData = await testCasesResponse.json();

        console.log('Received folders:', foldersData);
        console.log('Received test cases:', testCasesData);

        const projectFolders = Array.isArray(foldersData) ? foldersData.filter(folder => folder.project == selectedProjectId) : [];
        const projectTestCases = Array.isArray(testCasesData) ? testCasesData.filter(testCase => {
            const folder = projectFolders.find(f => f.id === testCase.folder);
            return folder !== undefined;
        }) : [];

        if (projectFolders.length === 0) {
            folderTree.innerHTML = '<div class="text-gray-500 text-center p-4">No folders found in this project</div>';
            return;
        }

        updateFolderTree(projectFolders, projectTestCases);

    } catch (error) {
        console.error('Error fetching data:', error);
        folderTree.innerHTML = '<div class="text-red-500 text-center p-4">Error loading data. Please try again.</div>';
    }
}

function updateFolderTree(folders, testcases) {
    const folderTree = document.getElementById('folderTree');
    if (!folderTree) return;

    folderTree.innerHTML = '';

    folders.forEach(folder => {
        const folderElement = createFolderElement(folder);
        
        const folderTestCases = testcases.filter(tc => tc.folder === folder.id);
        if (folderTestCases.length > 0) {
            const testCasesContainer = document.createElement('div');
            testCasesContainer.className = 'ml-6 mt-2';
            
            folderTestCases.forEach(testCase => {
                const testCaseElement = createTestCaseElement(testCase);
                testCasesContainer.appendChild(testCaseElement);
            });
            
            folderElement.appendChild(testCasesContainer);
        }

        folderTree.appendChild(folderElement);
    });
}
function createFolderElement(folder) {
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item mb-1';
    folderItem.setAttribute('data-folder-id', folder.id);
    
    const itemHeader = document.createElement('div');
    itemHeader.className = 'flex items-center space-x-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer';
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-folder text-yellow-500 text-sm';
    
    const title = document.createElement('span');
    title.textContent = folder.name;
    title.className = 'text-gray-700 dark:text-gray-200 text-sm';
    
    itemHeader.appendChild(icon);
    itemHeader.appendChild(title);
    folderItem.appendChild(itemHeader);
    
    return folderItem;
}

function createTestCaseElement(testCase) {
    const testCaseItem = document.createElement('div');
    testCaseItem.className = 'test-case-item flex items-center space-x-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer';
    testCaseItem.setAttribute('data-id', testCase.id);
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-file-alt text-blue-500 text-sm';
    
    const title = document.createElement('span');
    title.textContent = testCase.title;
    title.className = 'text-gray-700 dark:text-gray-200 text-sm';
    
    testCaseItem.appendChild(icon);
    testCaseItem.appendChild(title);
    
    testCaseItem.addEventListener('click', () => showTestCaseInfo(testCaseItem));
    
    return testCaseItem;
}

function toggleEditMode() {
    isEditing = !isEditing;
    const editButton = document.getElementById('editButton');
    const saveButton = document.getElementById('saveButton');
    const cancelButton = document.getElementById('cancelButton');
    const addStepBtn = document.getElementById('addStepBtn');
    const addConditionBtn = document.getElementById('addConditionBtn');
    
    if (isEditing) {
        // Store original values
        const descriptionEl = document.getElementById('descriptionContent');
        const conditionsEl = document.getElementById('conditionsContent');
        originalValues.description = descriptionEl ? descriptionEl.innerText : '';
        originalValues.conditions = conditionsEl ? conditionsEl.innerHTML : '';
        originalValues.steps = Array.from(document.querySelectorAll('.step-content')).map(el => el.innerText);
        originalValues.results = Array.from(document.querySelectorAll('.result-content')).map(el => el.innerText);
        originalValues.priority = document.getElementById('prioritySelect').value;
        originalValues.platform = document.getElementById('platformSelect').value;
        originalValues.testType = document.getElementById('testType').value;
        
        // Make content editable
        if (descriptionEl) {
            descriptionEl.contentEditable = true;
            if (descriptionEl.textContent.trim() === 'No description available') {
                descriptionEl.textContent = '';
            }
        }
        if (conditionsEl) {
            conditionsEl.contentEditable = true;
            if (conditionsEl.textContent.trim() === 'No conditions specified') {
                conditionsEl.innerHTML = '';
            }
        }
        document.querySelectorAll('.step-content, .result-content').forEach(el => el.contentEditable = true);
        document.getElementById('prioritySelect').disabled = false;
        document.getElementById('platformSelect').disabled = false;
        document.getElementById('testType').disabled = false;
        
        // Добавляем обработчики изменений
        document.getElementById('prioritySelect').addEventListener('change', updateSelectStyle);
        document.getElementById('platformSelect').addEventListener('change', updateSelectStyle);
        
        // Show/hide buttons
        editButton.classList.add('hidden');
        saveButton.classList.remove('hidden');
        saveButton.className = saveButton.getAttribute('data-active-class');
        cancelButton.classList.remove('hidden');
        cancelButton.className = cancelButton.getAttribute('data-active-class');
        addStepBtn.classList.remove('hidden');
        addConditionBtn.classList.remove('hidden');
        
        // Add editing styles
        if (descriptionEl) descriptionEl.classList.add('border', 'border-gray-300', 'p-2', 'rounded');
        if (conditionsEl) conditionsEl.classList.add('border', 'border-gray-300', 'p-2', 'rounded');
        document.querySelectorAll('.step-content, .result-content').forEach(el => {
            el.classList.add('border', 'border-gray-300', 'p-2', 'rounded');
        });
    }
}

function updateSelectStyle(event) {
    const select = event.target;
    if (select.id === 'prioritySelect') {
        if (!select.value) {
            select.className = 'bg-gray-100 text-gray-500 text-sm font-medium px-3 py-1 rounded-full border border-gray-200';
        } else {
            select.className = 'bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full';
        }
    } else if (select.id === 'platformSelect') {
        if (!select.value) {
            select.className = 'bg-gray-100 text-gray-500 text-sm font-medium px-3 py-1 rounded-full border border-gray-200';
        } else if (select.value === 'any') {
            select.className = 'bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full';
        } else {
            select.className = 'bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full';
        }
    }
}

function saveChanges() {
    isEditing = false;
    
    // Remove editable state
    const descriptionEl = document.getElementById('descriptionContent');
    const conditionsEl = document.getElementById('conditionsContent');
    if (descriptionEl) descriptionEl.contentEditable = false;
    if (conditionsEl) conditionsEl.contentEditable = false;
    document.querySelectorAll('.step-content, .result-content').forEach(el => el.contentEditable = false);
    document.getElementById('prioritySelect').disabled = true;
    document.getElementById('platformSelect').disabled = true;
    document.getElementById('testType').disabled = true;
    
    // Update buttons
    document.getElementById('editButton').classList.remove('hidden');
    document.getElementById('saveButton').classList.add('hidden');
    document.getElementById('cancelButton').classList.add('hidden');
    document.getElementById('addStepBtn').classList.add('hidden');
    document.getElementById('addConditionBtn').classList.add('hidden');
    
    // Remove editing styles
    if (descriptionEl) descriptionEl.classList.remove('border', 'border-gray-300', 'p-2', 'rounded');
    if (conditionsEl) conditionsEl.classList.remove('border', 'border-gray-300', 'p-2', 'rounded');
    document.querySelectorAll('.step-content, .result-content').forEach(el => {
        el.classList.remove('border', 'border-gray-300', 'p-2', 'rounded');
    });
}

function cancelEdit() {
    isEditing = false;
    
    // Restore original values
    const descriptionEl = document.getElementById('descriptionContent');
    const conditionsEl = document.getElementById('conditionsContent');
    if (descriptionEl) descriptionEl.innerText = originalValues.description;
    if (conditionsEl) conditionsEl.innerHTML = originalValues.conditions;
    document.querySelectorAll('.step-content').forEach((el, index) => {
        el.innerText = originalValues.steps[index] || '';
    });
    document.querySelectorAll('.result-content').forEach((el, index) => {
        el.innerText = originalValues.results[index] || '';
    });
    document.getElementById('prioritySelect').value = originalValues.priority;
    document.getElementById('platformSelect').value = originalValues.platform;
    document.getElementById('testType').value = originalValues.testType;
    
    // Remove editable state
    if (descriptionEl) descriptionEl.contentEditable = false;
    if (conditionsEl) conditionsEl.contentEditable = false;
    document.querySelectorAll('.step-content, .result-content').forEach(el => el.contentEditable = false);
    document.getElementById('prioritySelect').disabled = true;
    document.getElementById('platformSelect').disabled = true;
    document.getElementById('testType').disabled = true;
    
    // Update buttons
    document.getElementById('editButton').classList.remove('hidden');
    document.getElementById('saveButton').classList.add('hidden');
    document.getElementById('cancelButton').classList.add('hidden');
    document.getElementById('addStepBtn').classList.add('hidden');
    document.getElementById('addConditionBtn').classList.add('hidden');
    
    // Remove editing styles
    if (descriptionEl) descriptionEl.classList.remove('border', 'border-gray-300', 'p-2', 'rounded');
    if (conditionsEl) conditionsEl.classList.remove('border', 'border-gray-300', 'p-2', 'rounded');
    document.querySelectorAll('.step-content, .result-content').forEach(el => {
        el.classList.remove('border', 'border-gray-300', 'p-2', 'rounded');
    });
}


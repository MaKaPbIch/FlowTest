// Глобальный объект для работы с тест-кейсами
console.log('Initializing testcases.js');

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Анимация появления
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing test case manager...');
    
    // Create folder edit modal
    createFolderEditModal();
    
    if (localStorage.getItem('selectedProject')) {
        testCaseManager.fetchFoldersAndTestCases();
    }
});

// Create folder edit modal dynamically
function createFolderEditModal() {
    const modal = document.createElement('div');
    modal.id = 'folderEditModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center hidden';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black bg-opacity-50"></div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl z-10 w-96 max-w-full">
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200" id="folderModalTitle">Edit Folder</h3>
            </div>
            <form id="folderEditForm">
                <div class="px-6 py-4">
                    <input type="hidden" id="editFolderId">
                    <div class="mb-4">
                        <label for="folderName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Folder Name</label>
                        <input type="text" id="folderName" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-coral-500 focus:border-coral-500 dark:bg-gray-700 dark:text-white" required>
                    </div>
                    <div class="mb-4">
                        <label for="folderDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea id="folderDescription" rows="3" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-coral-500 focus:border-coral-500 dark:bg-gray-700 dark:text-white"></textarea>
                    </div>
                </div>
                <div class="px-6 py-3 bg-gray-50 dark:bg-gray-700 flex justify-end space-x-3 rounded-b-lg">
                    <button type="button" id="cancelFolderEdit" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral-500">
                        Cancel
                    </button>
                    <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-coral-600 border border-transparent rounded-md shadow-sm hover:bg-coral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral-500">
                        Save
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Функция для выполнения авторизованных запросов
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('access');
    if (!token) {
        throw new Error('No access token found');
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {}),
        },
    };

    // Формируем полный URL с учетом слеша
    let fullUrl;
    if (url.startsWith('http')) {
        fullUrl = url;
    } else if (url.startsWith('/')) {
        fullUrl = `${config.API_BASE_URL}${url}`;
    } else {
        fullUrl = `${config.API_BASE_URL}/${url}`;
    }

    try {
        const response = await fetch(fullUrl, finalOptions);
        
        if (response.status === 401) {
            // Токен истек, пробуем обновить
            const newToken = await refreshToken();
            if (newToken) {
                // Повторяем запрос с новым токеном
                finalOptions.headers.Authorization = `Bearer ${newToken}`;
                return fetch(fullUrl, finalOptions);
            }
        }
        
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

window.testCaseManager = {
    current: null,
    isEditing: false,
    folders: [],
    contextMenu: null,
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
        
        // Проверяем, есть ли выбранный проект
        const selectedProject = localStorage.getItem('selectedProject');
        if (selectedProject) {
            await this.fetchFoldersAndTestCases();
        }
    },

    // Загрузка папок и тест-кейсов
    async fetchFoldersAndTestCases() {
        try {
            const selectedProjectId = localStorage.getItem('selectedProject');
            console.log('Selected project ID:', selectedProjectId);
            
            const folderTree = document.getElementById('folderTree');
            if (!folderTree) {
                console.error('Folder tree container not found');
                return;
            }

            if (!selectedProjectId) {
                console.log('No project selected');
                folderTree.innerHTML = '<div class="text-gray-500 text-center p-4">Please select a project first</div>';
                return;
            }

            folderTree.innerHTML = '<div class="text-gray-500 text-center p-4">Loading...</div>';

            // Получаем папки проекта
            console.log('Fetching folders...');
            const foldersResponse = await fetchWithAuth(`/folders/?project=${selectedProjectId}`);
            if (!foldersResponse.ok) {
                throw new Error('Failed to fetch folders');
            }
            const folders = await foldersResponse.json();
            console.log('Project folders:', folders);
            // Сохраняем список папок в свойство объекта
            this.folders = folders;

            // Получаем тест-кейсы проекта
            console.log('Fetching test cases...');
            const testCasesResponse = await fetchWithAuth(`/testcases/?project=${selectedProjectId}`);
            if (!testCasesResponse.ok) {
                throw new Error('Failed to fetch test cases');
            }
            const testCases = await testCasesResponse.json();
            console.log('Project test cases:', testCases);

            // Обновляем дерево папок
            this.updateFolderTree(folders, testCases);

        } catch (error) {
            console.error('Error fetching data:', error);
            if (folderTree) {
                folderTree.innerHTML = `<div class="text-red-500 text-center p-4">Error: ${error.message}</div>`;
            }
            showNotification(`Failed to load data: ${error.message}`, 'error');
        }
    },

    // Обновление дерева папок
    updateFolderTree(folders, testcases, data) {
        console.log('Updating folder tree with:', { folders, testcases, data });
        const folderTree = document.getElementById('folderTree');
        if (!folderTree) return;

        // Store original folders and test cases for filtering/sorting
        this.originalFolders = [...folders];
        this.originalTestCases = [...testcases];

        // Apply any active filters or sorts
        const filteredAndSortedFolders = this.applyFiltersAndSort(folders);
        
        folderTree.innerHTML = '';
        
        // Debug - print out all folders to make sure we have them
        console.log('All folders to render:', filteredAndSortedFolders.map(f => ({ id: f.id, name: f.name })));

        filteredAndSortedFolders.forEach(folder => {
            const { folderElement, testCasesContainer } = this.createFolderElement(folder);
            
            // Находим тест-кейсы для текущей папки
            const folderTestCases = testcases.filter(tc => {
                const isMatch = tc.folder === folder.id;
                return isMatch;
            });

            if (folderTestCases.length > 0) {
                folderTestCases.forEach(testCase => {
                    const testCaseElement = this.createTestCaseElement(testCase);
                    testCasesContainer.appendChild(testCaseElement);
                });
            }

            folderTree.appendChild(folderElement);
        });
        
        // Initialize search, filter, and sort handlers if not already done
        this.initializeSearchAndFilters();
    },
    
    // Apply filters and sorting to folders and test cases
    applyFiltersAndSort(folders) {
        let result = [...folders];
        
        // Get search query
        const searchQuery = document.getElementById('searchInput')?.value?.toLowerCase() || '';
        
        // Get filter values
        const dateFilter = document.getElementById('dateFilter')?.value || 'all';
        const folderTypeFilter = document.getElementById('folderTypeFilter')?.value || 'all';
        const authorFilter = document.getElementById('authorFilter')?.value || 'all';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        
        // Get sort values
        const sortField = document.getElementById('sortField')?.value || 'name';
        const sortOrder = document.getElementById('sortOrder')?.value || 'asc';
        
        // Track folders that should be expanded because they contain matching test cases
        const foldersToExpand = new Set();
        
        // If there's a search query, we need to search through both folders and test cases
        if (searchQuery) {
            // Mark test cases that match the search query
            const matchingTestCases = this.originalTestCases.filter(testCase => 
                testCase.title?.toLowerCase().includes(searchQuery) || 
                testCase.description?.toLowerCase().includes(searchQuery)
            );
            
            // Get the folder IDs of the matching test cases
            matchingTestCases.forEach(testCase => {
                if (testCase.folder) {
                    foldersToExpand.add(testCase.folder);
                }
            });
            
            // Also include folders that match the search query directly
            const matchingFolders = folders.filter(folder => 
                folder.name.toLowerCase().includes(searchQuery) || 
                (folder.description && folder.description.toLowerCase().includes(searchQuery))
            );
            
            matchingFolders.forEach(folder => foldersToExpand.add(folder.id));
            
            // Save matching folders for highlighting
            this.matchingFolders = matchingFolders.map(f => f.id);
            this.matchingTestCases = matchingTestCases.map(tc => tc.id);
            
            // Update search results counter
            const totalMatches = matchingFolders.length + matchingTestCases.length;
            const resultCountElement = document.getElementById('resultCount');
            const searchResultsCounter = document.getElementById('searchResultsCounter');
            
            if (resultCountElement && searchResultsCounter) {
                resultCountElement.textContent = totalMatches;
                if (totalMatches > 0) {
                    searchResultsCounter.classList.remove('hidden');
                } else {
                    searchResultsCounter.classList.add('hidden');
                }
            }
            
            // If there's a search, return all folders so we can properly expand them
            // We'll handle the UI highlighting separately
        }
        
        // Apply date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            let dateLimit;
            
            switch (dateFilter) {
                case 'today':
                    dateLimit = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'week':
                    dateLimit = new Date(now);
                    dateLimit.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    dateLimit = new Date(now);
                    dateLimit.setMonth(now.getMonth() - 1);
                    break;
                case 'custom':
                    // Custom date range would need a date picker UI
                    // For now, default to 30 days
                    dateLimit = new Date(now);
                    dateLimit.setDate(now.getDate() - 30);
                    break;
            }
            
            if (dateLimit) {
                result = result.filter(folder => new Date(folder.created_at) > dateLimit);
            }
        }
        
        // Apply folder type filter
        if (folderTypeFilter !== 'all') {
            switch (folderTypeFilter) {
                case 'root':
                    result = result.filter(folder => !folder.parent_folder);
                    break;
                case 'sub':
                    result = result.filter(folder => folder.parent_folder);
                    break;
                case 'empty':
                    // Filter for folders with no test cases
                    // This assumes we have a count of test cases in the folder object
                    // or we'd need to check the testcases array
                    result = result.filter(folder => 
                        !this.originalTestCases.some(tc => tc.folder === folder.id)
                    );
                    break;
                case 'with_tests':
                    // Filter for folders with test cases
                    result = result.filter(folder => 
                        this.originalTestCases.some(tc => tc.folder === folder.id)
                    );
                    break;
            }
        }
        
        // Apply author filter (would require author information in folder objects)
        if (authorFilter !== 'all') {
            const currentUserId = localStorage.getItem('userId'); // Assuming we store this
            
            if (authorFilter === 'me' && currentUserId) {
                result = result.filter(folder => folder.created_by === parseInt(currentUserId));
            } else if (authorFilter !== 'me') {
                // Filter by specific user ID
                result = result.filter(folder => folder.created_by === parseInt(authorFilter));
            }
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(folder => folder.status === statusFilter);
        }
        
        // Apply sorting
        const sortConfig = `${sortField}_${sortOrder}`;
        switch (sortConfig) {
            case 'name_asc':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name_desc':
                result.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'date_asc':
                result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'date_desc':
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'priority_asc':
                // Priority sorting (if folders have priority)
                result.sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
                });
                break;
            case 'priority_desc':
                result.sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                });
                break;
            case 'status_asc':
                result.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
                break;
            case 'status_desc':
                result.sort((a, b) => (b.status || '').localeCompare(a.status || ''));
                break;
        }
        
        return result;
    },
    
    // Helper function to determine if a folder should be expanded
    shouldExpandFolder(folderId) {
        // If we're searching and this folder contains matching test cases, expand it
        if (this.matchingTestCases && this.matchingTestCases.length > 0) {
            // Check if any matching test case belongs to this folder
            const matchingTestCase = this.originalTestCases.find(tc => 
                this.matchingTestCases.includes(tc.id) && tc.folder === folderId
            );
            return !!matchingTestCase;
        }
        return false;
    },

    // Initialize search and filter event handlers
    initializeSearchAndFilters() {
        // Only set up once
        if (this.filtersInitialized) return;
        this.filtersInitialized = true;
        
        // Initialize empty arrays for tracking search matches
        this.matchingFolders = [];
        this.matchingTestCases = [];
        
        // Search input handler
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.debounceSearch();
                
                // Show/hide clear button based on input
                const clearSearchBtn = document.getElementById('clearSearch');
                if (clearSearchBtn) {
                    if (searchInput.value) {
                        clearSearchBtn.classList.remove('hidden');
                    } else {
                        clearSearchBtn.classList.add('hidden');
                        
                        // Also hide the results counter when search is cleared
                        const searchResultsCounter = document.getElementById('searchResultsCounter');
                        if (searchResultsCounter) {
                            searchResultsCounter.classList.add('hidden');
                        }
                    }
                }
            });
            
            // Clear search button
            const clearSearchBtn = document.getElementById('clearSearch');
            if (clearSearchBtn) {
                clearSearchBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    clearSearchBtn.classList.add('hidden');
                    
                    // Clear search matches
                    this.matchingFolders = [];
                    this.matchingTestCases = [];
                    
                    // Hide the results counter
                    const searchResultsCounter = document.getElementById('searchResultsCounter');
                    if (searchResultsCounter) {
                        searchResultsCounter.classList.add('hidden');
                    }
                    
                    // Refresh the tree
                    this.updateFolderTree(this.originalFolders, this.originalTestCases);
                });
            }
        }
        
        // Toggle filter panel
        const toggleFilters = document.getElementById('toggleFilters');
        const filterPanel = document.getElementById('filterPanel');
        const filterArrow = document.getElementById('filterArrow');
        
        if (toggleFilters && filterPanel) {
            toggleFilters.addEventListener('click', () => {
                filterPanel.classList.toggle('hidden');
                filterArrow.classList.toggle('transform');
                filterArrow.classList.toggle('rotate-180');
            });
        }
        
        // Apply filters button
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.updateFolderTree(this.originalFolders, this.originalTestCases);
                // Optional: close the filter panel
                if (filterPanel) filterPanel.classList.add('hidden');
                if (filterArrow) filterArrow.classList.remove('rotate-180');
            });
        }
        
        // Reset filters button
        const resetFiltersBtn = document.getElementById('resetFilters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                // Reset all filter and sort controls to defaults
                document.getElementById('dateFilter').value = 'all';
                document.getElementById('folderTypeFilter').value = 'all';
                document.getElementById('authorFilter').value = 'all';
                document.getElementById('statusFilter').value = 'all';
                document.getElementById('sortField').value = 'name';
                document.getElementById('sortOrder').value = 'asc';
                
                // Update folder tree with reset filters
                this.updateFolderTree(this.originalFolders, this.originalTestCases);
            });
        }
        
        // Initialize filter change handlers
        ['dateFilter', 'folderTypeFilter', 'authorFilter', 'statusFilter', 'sortField', 'sortOrder'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    // Auto-apply when changed (optional)
                    // this.updateFolderTree(this.originalFolders, this.originalTestCases);
                    
                    // Or just update a 'changes pending' indicator
                    if (applyFiltersBtn) {
                        applyFiltersBtn.classList.add('animate-pulse');
                        setTimeout(() => {
                            applyFiltersBtn.classList.remove('animate-pulse');
                        }, 500);
                    }
                });
            }
        });
    },
    
    // Debounce search to avoid too many updates
    debounceSearchTimeout: null,
    debounceSearch() {
        if (this.debounceSearchTimeout) {
            clearTimeout(this.debounceSearchTimeout);
        }
        
        this.debounceSearchTimeout = setTimeout(() => {
            this.updateFolderTree(this.originalFolders, this.originalTestCases);
        }, 300);
    },

    // Создание элемента папки
    createFolderElement(folder) {
        const folderElement = document.createElement('div');
        folderElement.className = 'folder-item mb-2';
        folderElement.setAttribute('data-id', folder.id);
        
        // Check if this folder should be highlighted due to search match
        const isSearchMatch = this.matchingFolders && this.matchingFolders.includes(folder.id);
        const shouldExpand = this.shouldExpandFolder(folder.id);
        
        const header = document.createElement('div');
        header.className = `flex items-center p-2 ${isSearchMatch ? 'bg-blue-50 dark:bg-blue-900/30' : ''} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer`;

        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'w-6 h-6 flex items-center justify-center mr-1';

        const toggleIcon = document.createElement('i');
        toggleIcon.className = `fas fa-chevron-right text-gray-500 transform transition-transform duration-200 ${shouldExpand ? 'rotate-90' : ''}`;
        toggleIcon.style.fontSize = '12px';
        toggleWrapper.appendChild(toggleIcon);

        const folderIcon = document.createElement('i');
        folderIcon.className = `fas fa-folder${shouldExpand ? '-open' : ''} text-yellow-500 mr-2`;

        const title = document.createElement('span');
        title.textContent = folder.name;
        title.className = `text-sm ${isSearchMatch ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`;

        header.appendChild(toggleWrapper);
        header.appendChild(folderIcon);
        header.appendChild(title);
        folderElement.appendChild(header);

        // Контейнер для тест-кейсов
        const testCasesContainer = document.createElement('div');
        testCasesContainer.className = `pl-8 ${shouldExpand ? '' : 'hidden'}`;
        folderElement.appendChild(testCasesContainer);

        // Добавляем обработчик для сворачивания/разворачивания и отображения информации
        header.addEventListener('click', (e) => {
            // Переключаем видимость контейнера тест-кейсов
            testCasesContainer.classList.toggle('hidden');
            
            // Rotate the toggle icon
            toggleIcon.classList.toggle('rotate-90');
            
            // Change folder icon to open/closed state
            if (testCasesContainer.classList.contains('hidden')) {
                folderIcon.className = 'fas fa-folder text-yellow-500 mr-2';
            } else {
                folderIcon.className = 'fas fa-folder-open text-yellow-500 mr-2';
            }

            // Показываем информацию о папке
            const emptyState = document.getElementById('emptyState');
            const testCaseInfo = document.getElementById('testCaseInfo');
            if (emptyState) emptyState.classList.add('hidden');
            if (testCaseInfo) {
                testCaseInfo.classList.remove('hidden');
                
                // Создаем или обновляем кастомную секцию для папки
                let folderSection = testCaseInfo.querySelector('.folder-section');
                if (!folderSection) {
                    // Если секции нет, создаем ее
                    folderSection = document.createElement('div');
                    folderSection.className = 'folder-section bg-gray-50 rounded-2xl shadow-lg overflow-hidden border border-gray-200 mb-6';
                    testCaseInfo.insertBefore(folderSection, testCaseInfo.firstChild);
                }
                
                // Обновляем содержимое секции папки
                folderSection.innerHTML = `
                    <div class="p-6">
                        <div class="flex justify-between mb-4 text-sm text-gray-500">
                            <span>Created: <span class="folder-created-at">${folder.created_at ? new Date(folder.created_at).toLocaleString() : '-'}</span></span>
                            <span>Last Modified: <span class="folder-updated-at">${folder.updated_at ? new Date(folder.updated_at).toLocaleString() : '-'}</span></span>
                        </div>
                        
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center space-x-4 flex-grow">
                                <div class="bg-yellow-100 p-2 rounded-lg">
                                    <i class="fas fa-folder text-yellow-500 text-xl"></i>
                                </div>
                                <div class="text-2xl font-bold text-gray-800">${folder.name}</div>
                            </div>
                            <div class="flex space-x-3">
                                <button class="edit-folder-btn px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                                    <i class="fas fa-edit mr-1"></i>
                                    Edit
                                </button>
                                <button class="delete-folder-btn px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                                    <i class="fas fa-trash mr-1"></i>
                                    Delete
                                </button>
                            </div>
                        </div>
                        
                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <div class="folder-description w-full p-3 bg-white border border-gray-200 rounded-lg text-gray-700 min-h-[80px]">
                                ${folder.description || 'No description provided'}
                            </div>
                        </div>
                        
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="text-sm text-gray-500">Contains:</span>
                                <span class="folder-items-count ml-2 px-3 py-1 bg-gray-200 rounded-full text-sm">
                                    ${(folder.test_cases?.length || 0) + (folder.children?.length || 0)} items
                                </span>
                            </div>
                            <button class="add-test-case-btn px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200" 
                                    onclick="testCaseManager.createTestCase(${folder.id})">
                                <i class="fas fa-plus mr-1"></i>
                                Add Test Case
                            </button>
                        </div>
                    </div>
                `;
                
                // Привязываем события к кнопкам
                const editBtn = folderSection.querySelector('.edit-folder-btn');
                const deleteBtn = folderSection.querySelector('.delete-folder-btn');
                if (editBtn) {
                    editBtn.onclick = () => this.editFolder(folder.id);
                }
                if (deleteBtn) {
                    deleteBtn.onclick = () => this.deleteFolder(folder.id);
                }
                
                // Скрываем стандартный UI для тест-кейсов
                const mainTestCaseUI = testCaseInfo.querySelector('.bg-white.rounded-2xl');
                if (mainTestCaseUI) {
                    mainTestCaseUI.classList.add('hidden');
                }
            }
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
        
        // Check if this test case should be highlighted due to search match
        const isSearchMatch = this.matchingTestCases && this.matchingTestCases.includes(testCase.id);

        const content = document.createElement('div');
        content.className = `flex items-center p-2 ${isSearchMatch ? 'bg-blue-50 dark:bg-blue-900/30' : ''} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer`;

        const icon = document.createElement('i');
        icon.className = 'fas fa-file-alt text-blue-500 mr-2';

        const title = document.createElement('span');
        title.textContent = testCase.title;
        title.className = `text-sm ${isSearchMatch ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`;

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
        try {
            const response = await fetchWithAuth(`/testcases/${id}/`);
            if (!response.ok) {
                throw new Error('Failed to fetch test case details');
            }
            const testCase = await response.json();
            this.current = testCase;
            this.updateTestCaseInfo(testCase);
            
            // Проверяем наличие теста в репозитории
            await this.checkTestInRepository(testCase);
            
        } catch (error) {
            console.error('Error loading test case:', error);
            showNotification('Error loading test case details', 'error');
        }
    },

    // Обновить информацию о тест-кейсе в UI
    async updateTestCaseInfo(testCase) {
        // Заголовок и даты
        testCaseInfo.querySelector('.test-case-title').value = testCase.title;
        testCaseInfo.querySelector('.created-at').textContent = new Date(testCase.created_at).toLocaleString();
        testCaseInfo.querySelector('.updated-at').textContent = new Date(testCase.updated_at).toLocaleString();

        // Основная информация
        document.getElementById('platform').value = testCase.platform || '';
        document.getElementById('priority').value = testCase.priority || '';
        document.getElementById('testType').value = testCase.test_type || '';
        document.getElementById('estimatedTime').value = testCase.estimated_time || 30;
        document.getElementById('description').value = testCase.description || '';

        // Код теста
        const codeElement = document.getElementById('testCode');
        codeElement.textContent = testCase.test_code || '';
        Prism.highlightElement(codeElement);

        // Теги
        const tagsContainer = document.getElementById('tagsContainer');
        tagsContainer.innerHTML = '';
        if (testCase.tags && Array.isArray(testCase.tags)) {
            testCase.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600';
                tagElement.textContent = tag;
                const deleteButton = document.createElement('button');
                deleteButton.className = 'ml-2 text-gray-500 hover:text-red-500 edit-action-button hidden';
                deleteButton.innerHTML = '×';
                deleteButton.onclick = () => this.removeTag(tag);
                tagElement.appendChild(deleteButton);
                tagsContainer.appendChild(tagElement);
            });
        }
        const addTagButton = document.createElement('button');
        addTagButton.className = 'px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 edit-action-button hidden';
        addTagButton.textContent = '+ Add Tag';
        addTagButton.onclick = () => this.addTag();
        tagsContainer.appendChild(addTagButton);

        // Шаги
        const stepsContainer = document.getElementById('stepsContainer');
        stepsContainer.innerHTML = '';
        
        let steps = [];
        if (testCase.steps) {
            try {
                // Если steps - строка JSON, пробуем распарсить
                if (typeof testCase.steps === 'string') {
                    steps = JSON.parse(testCase.steps);
                } 
                // Если steps уже массив, используем как есть
                else if (Array.isArray(testCase.steps)) {
                    steps = testCase.steps;
                }
                // В противном случае считаем что это пустой массив
                else {
                    console.warn('Steps is neither a JSON string nor an array:', testCase.steps);
                    steps = [];
                }
            } catch (e) {
                console.error('Failed to parse steps:', e);
                steps = [];
            }
        }

        steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'bg-white p-4 rounded-lg shadow border border-gray-100';
            stepElement.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <span class="font-medium text-gray-700">Step ${index + 1}</span>
                    <button onclick="testCaseManager.removeStep(${index})" class="text-red-500 hover:text-red-700 edit-action-button hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="flex gap-4">
                    <textarea class="w-1/2 p-2 border border-gray-200 rounded-lg" readonly>${step.description || ''}</textarea>
                    <textarea class="w-1/2 p-2 border border-gray-200 rounded-lg" readonly>${step.expected_result || ''}</textarea>
                </div>`;
            stepsContainer.appendChild(stepElement);
        });
    },

    // Включить режим редактирования
    enableEditMode() {
        const testCaseInfo = document.getElementById('testCaseInfo');
        const editBtn = testCaseInfo.querySelector('.edit-test-btn');
        
        // Меняем текст кнопки
        editBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Save`;
        editBtn.onclick = () => this.saveChanges();
        
        // Показываем кнопки действий
        testCaseInfo.querySelectorAll('.edit-action-button').forEach(btn => btn.classList.remove('hidden'));
        
        // Делаем поля редактируемыми
        testCaseInfo.querySelectorAll('input, textarea, select').forEach(el => {
            el.readOnly = false;
            el.disabled = false;
        });
    },

    // Сохранить изменения
    async saveChanges() {
        try {
            if (!this.current) return;
            
            const updatedData = {
                title: document.getElementById('testCaseTitle').value,
                description: document.getElementById('description').value,
                conditions: document.getElementById('conditions').value,
                priority: document.getElementById('priority').value,
                platform: document.getElementById('platform').value,
                test_type: document.getElementById('testType').value,
                steps: Array.from(document.querySelectorAll('.step-item')).map(item => item.querySelector('textarea').value),
                results: Array.from(document.querySelectorAll('.result-item')).map(item => item.querySelector('textarea').value),
                tags: Array.from(document.querySelectorAll('.tag')).map(tag => tag.textContent.trim())
            };
            
            const response = await fetchWithAuth(`/testcases/${this.current.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to update test case');
            }
            
            const updatedTestCase = await response.json();
            this.current = updatedTestCase;
            this.updateTestCaseInfo(updatedTestCase);
            this.disableEditMode();
            showNotification('Test case updated successfully', 'success');
            
        } catch (error) {
            console.error('Error saving changes:', error);
            showNotification('Error saving changes', 'error');
        }
    },

    // Добавить тег
    addTag() {
        const tagInput = document.getElementById('addTagInput');
        const tag = tagInput.value.trim();
        if (tag) {
            const tagsContainer = document.getElementById('tagsContainer');
            const tagElement = document.createElement('span');
            tagElement.className = 'px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600';
            tagElement.textContent = tag;
            const deleteButton = document.createElement('button');
            deleteButton.className = 'ml-2 text-gray-500 hover:text-red-500';
            deleteButton.innerHTML = '×';
            deleteButton.onclick = () => tagElement.remove();
            tagElement.appendChild(deleteButton);
            tagsContainer.insertBefore(tagElement, tagsContainer.lastChild);
            tagInput.value = '';
        }
    },

    // Удалить тег
    removeTag(tag) {
        const tagElements = document.getElementById('tagsContainer').querySelectorAll('span');
        tagElements.forEach(el => {
            if (el.textContent.replace('×', '').trim() === tag) {
                el.remove();
            }
        });
    },

    // Добавить шаг
    addStep() {
        const stepsContainer = document.getElementById('stepsContainer');
        const stepCount = stepsContainer.children.length + 1;
        const stepElement = document.createElement('div');
        stepElement.className = 'bg-white p-4 rounded-lg shadow border border-gray-100';
        stepElement.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="font-medium text-gray-700">Step ${stepCount}</span>
                <button onclick="testCaseManager.removeStep(${stepCount - 1})" class="text-red-500 hover:text-red-700">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="flex gap-4">
                <textarea class="w-1/2 p-2 border border-gray-200 rounded-lg" placeholder="Enter step description"></textarea>
                <textarea class="w-1/2 p-2 border border-gray-200 rounded-lg" placeholder="Expected result"></textarea>
            </div>`;
        stepsContainer.appendChild(stepElement);
    },

    // Удалить шаг
    removeStep(index) {
        const stepsContainer = document.getElementById('stepsContainer');
        stepsContainer.children[index].remove();
        // Обновляем нумерацию оставшихся шагов
        Array.from(stepsContainer.children).forEach((step, i) => {
            step.querySelector('.font-medium').textContent = `Step ${i + 1}`;
            step.querySelector('button').setAttribute('onclick', `testCaseManager.removeStep(${i})`);
        });
    },

    // Копировать код в буфер обмена
    copyCode() {
        const code = document.getElementById('testCode').textContent;
        navigator.clipboard.writeText(code).then(() => {
            showNotification('Code copied to clipboard', 'success');
        }).catch(err => {
            console.error('Failed to copy code:', err);
            showNotification('Failed to copy code', 'error');
        });
    },

    // Проверка наличия теста в репозитории
    async checkTestInRepository(testCase) {
        try {
            // Если тест не имеет имени класса или имени метода, то скорее всего он не в репозитории
            if (!testCase.class_name || !testCase.method_name) {
                this.updateTestInRepositoryStatus(false);
                return false;
            }
            
            const response = await fetchWithAuth(`/check-test-existence/${testCase.id}/`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return {
                exists: data.exists,
                hasCode: data.has_code
            };
        } catch (error) {
            console.error('Error checking test in repository:', error);
            return {
                exists: false,
                hasCode: false
            };
        }
    },

    // Обновление состояния кнопки запуска теста
    async updateRunButton(testCase) {
        const runButton = document.querySelector('.test-case-actions button');
        
        if (runButton) {
            const { exists, hasCode } = await this.checkTestInRepository(testCase);
            if (exists && hasCode) {
                runButton.removeAttribute('disabled');
                runButton.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                runButton.setAttribute('disabled', 'true');
                runButton.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    },

    // Edit folder dialog
    editFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;
        
        // Check if modal exists, if not, create it
        let modal = document.getElementById('folderEditModal');
        if (!modal) {
            createFolderEditModal();
            modal = document.getElementById('folderEditModal');
            
            // Add event listeners once
            document.getElementById('cancelFolderEdit').addEventListener('click', () => {
                modal.classList.add('hidden');
            });
            
            document.getElementById('folderEditForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const folderId = document.getElementById('editFolderId').value;
                const folderName = document.getElementById('folderName').value.trim();
                const folderDesc = document.getElementById('folderDescription').value.trim();
                
                if (!folderName) {
                    showNotification('Folder name cannot be empty', 'error');
                    return;
                }
                
                try {
                    const response = await fetchWithAuth(`/folders/${folderId}/`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            name: folderName,
                            description: folderDesc
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to update folder');
                    }
                    
                    // Close modal
                    modal.classList.add('hidden');
                    
                    // Refresh the folder tree
                    await this.fetchFoldersAndTestCases();
                    
                    showNotification('Folder updated successfully', 'success');
                } catch (error) {
                    console.error('Error updating folder:', error);
                    showNotification('Error updating folder', 'error');
                }
            });
        }
        
        // Fill in form values
        document.getElementById('editFolderId').value = folder.id;
        document.getElementById('folderName').value = folder.name;
        document.getElementById('folderDescription').value = folder.description || '';
        document.getElementById('folderModalTitle').textContent = 'Edit Folder';
        
        // Show modal
        modal.classList.remove('hidden');
    },
    
    // Delete folder
    async deleteFolder(folderId) {
        if (!confirm(translations['confirm_delete_folder'] || 'Are you sure you want to delete this folder? This will also delete all test cases inside it.')) {
            return;
        }
        
        try {
            console.log('Attempting to delete folder with ID:', folderId);
            const response = await fetchWithAuth(`/folders/${folderId}/`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete folder');
            }
            
            console.log('Folder deleted on server, updating UI...');
            
            // Refresh the folder tree - let's fully reload to ensure synchronization
            await this.fetchFoldersAndTestCases();
            
            // Clear the test case view
            const testCaseInfo = document.getElementById('testCaseInfo');
            const emptyState = document.getElementById('emptyState');
            if (testCaseInfo) testCaseInfo.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            
            showNotification('Folder deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting folder:', error);
            showNotification('Error deleting folder', 'error');
        }
    },
    
    // Edit folder dialog
    editFolder(folderId) {
        console.log(`Editing folder with ID: ${folderId}`);
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) {
            console.error(`Folder with ID ${folderId} not found!`);
            return;
        }
        
        console.log('Found folder to edit:', folder);
        
        // Create or get existing modal
        let modal = document.getElementById('folderEditModal');
        if (!modal) {
            createFolderEditModal();
            modal = document.getElementById('folderEditModal');
        }
        
        // Fill in form values
        document.getElementById('editFolderId').value = folder.id;
        document.getElementById('folderName').value = folder.name;
        document.getElementById('folderDescription').value = folder.description || '';
        document.getElementById('folderModalTitle').textContent = 'Edit Folder';
        
        // Set up form submission for editing
        const setupEditForm = () => {
            // Remove existing listener by cloning form
            const form = document.getElementById('folderEditForm');
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            // Add cancel handler
            document.getElementById('cancelFolderEdit').onclick = () => {
                modal.classList.add('hidden');
            };
            
            // Add submit handler
            document.getElementById('folderEditForm').onsubmit = async (e) => {
                e.preventDefault();
                const editId = document.getElementById('editFolderId').value;
                const name = document.getElementById('folderName').value.trim();
                const desc = document.getElementById('folderDescription').value.trim();
                
                console.log(`Submitting edit for folder ID: ${editId}`);
                
                if (!name) {
                    showNotification('Folder name cannot be empty', 'error');
                    return;
                }
                
                try {
                    const response = await fetchWithAuth(`/folders/${editId}/`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            name: name,
                            description: desc
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to update folder');
                    }
                    
                    // Close modal first
                    modal.classList.add('hidden');
                    
                    // Refresh folders to ensure we have correct data
                    await testCaseManager.fetchFoldersAndTestCases();
                    
                    showNotification('Folder updated successfully', 'success');
                } catch (error) {
                    console.error('Error updating folder:', error);
                    showNotification('Error updating folder', 'error');
                }
            };
        };
        
        setupEditForm();
        modal.classList.remove('hidden');
    },
    
    // Create a new folder
    async createFolder(parentId = null) {
        // Create or get existing modal
        let modal = document.getElementById('folderEditModal');
        if (!modal) {
            createFolderEditModal();
            modal = document.getElementById('folderEditModal');
        }
        
        // Reset form values for new folder
        document.getElementById('editFolderId').value = '';
        document.getElementById('folderName').value = '';
        document.getElementById('folderDescription').value = '';
        document.getElementById('folderModalTitle').textContent = 'Create New Folder';
        
        // Set up form submission for creating
        const setupCreateForm = () => {
            // Remove existing listener by cloning form
            const form = document.getElementById('folderEditForm');
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            // Add cancel handler
            document.getElementById('cancelFolderEdit').onclick = () => {
                modal.classList.add('hidden');
            };
            
            // Add submit handler
            document.getElementById('folderEditForm').onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('folderName').value.trim();
                const desc = document.getElementById('folderDescription').value.trim();
                
                if (!name) {
                    showNotification('Folder name cannot be empty', 'error');
                    return;
                }
                
                try {
                    // Creating a new folder
                    const projectId = localStorage.getItem('selectedProject');
                    if (!projectId) {
                        showNotification('Please select a project first', 'error');
                        return;
                    }
                    
                    const folderData = {
                        name: name,
                        description: desc,
                        project: projectId
                    };
                    
                    if (parentId) {
                        folderData.parent_folder = parentId;
                    }
                    
                    console.log('Creating folder with data:', folderData);
                    
                    const response = await fetchWithAuth('/folders/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(folderData)
                    });
                    
                    const responseText = await response.text();
                    console.log('Server response:', responseText);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to create folder: ${responseText}`);
                    }
                    
                    // Close modal first
                    modal.classList.add('hidden');
                    
                    // Refresh folders to ensure we have correct data
                    await testCaseManager.fetchFoldersAndTestCases();
                    
                    showNotification('Folder created successfully', 'success');
                } catch (error) {
                    console.error('Error creating folder:', error);
                    showNotification('Error creating folder', 'error');
                }
            };
        };
        
        setupCreateForm();
        
        // Show modal
        modal.classList.remove('hidden');
    },
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

// Добавляем модальное окно с сообщением
function showModal(message, type = 'info') {
    const modal = document.createElement('div');
    modal.className = `fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4`;
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transform transition-all">
            <div class="flex items-center ${type === 'error' ? 'text-red-500' : 'text-green-500'} mb-4">
                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    ${type === 'error' 
                        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' 
                        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'}
                </svg>
                <h3 class="text-lg font-medium">${type === 'error' ? 'Error' : 'Success'}</h3>
            </div>
            <div class="text-gray-700 dark:text-gray-300 mb-6">${message}</div>
            <div class="text-right">
                <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" onclick="this.parentNode.parentNode.parentNode.remove()">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
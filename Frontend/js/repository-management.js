document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const repositoryList = document.getElementById('repositoryList');
    const repositoryModal = document.getElementById('repositoryModal');
    const repositoryForm = document.getElementById('repositoryForm');
    const addRepositoryBtn = document.getElementById('addRepositoryBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const repositoryType = document.getElementById('repositoryType');
    const usernameField = document.getElementById('usernameField');

    // Event Listeners
    addRepositoryBtn.addEventListener('click', () => showModal());
    cancelBtn.addEventListener('click', () => hideModal());
    repositoryForm.addEventListener('submit', handleFormSubmit);
    repositoryType.addEventListener('change', toggleUsernameField);

    // Show/hide username field based on repository type
    function toggleUsernameField() {
        usernameField.style.display = 
            repositoryType.value === 'bitbucket' ? 'block' : 'none';
    }

    // Fetch and display repositories
    async function fetchRepositories() {
        try {
            const response = await fetch('/api/automation-projects/');
            const data = await response.json();
            displayRepositories(data);
        } catch (error) {
            console.error('Error fetching repositories:', error);
            showError('Failed to load repositories');
        }
    }

    // Display repositories in the list
    function displayRepositories(repositories) {
        repositoryList.innerHTML = repositories.map(repo => `
            <div class="p-4 border-b border-gray-200">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold">${repo.name}</h3>
                        <p class="text-sm text-gray-500">${repo.repository_url}</p>
                        <div class="mt-2 flex space-x-4 text-sm text-gray-500">
                            <span>Branch: ${repo.branch}</span>
                            <span>Framework: ${repo.framework}</span>
                            <span>Status: ${repo.sync_status}</span>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="syncRepository(${repo.id})" 
                                class="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700">
                            Sync
                        </button>
                        <button onclick="editRepository(${repo.id})"
                                class="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200">
                            Edit
                        </button>
                        <button onclick="deleteRepository(${repo.id})"
                                class="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700">
                            Delete
                        </button>
                    </div>
                </div>
                ${repo.tests ? displayTests(repo.tests) : ''}
            </div>
        `).join('');
    }

    // Display tests for a repository
    function displayTests(tests) {
        if (!tests.length) return '';
        
        return `
            <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-2">Tests</h4>
                <div class="space-y-2">
                    ${tests.map(test => `
                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span>${test.name}</span>
                            <button onclick="runTest(${test.id})"
                                    class="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700">
                                Run
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Show modal for adding/editing repository
    function showModal(repository = null) {
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('repositoryForm');
        
        modalTitle.textContent = repository ? 'Edit Repository' : 'Add Repository';
        
        if (repository) {
            // Fill form with repository data
            Object.keys(repository).forEach(key => {
                const input = document.getElementById(key);
                if (input) input.value = repository[key];
            });
        } else {
            // Reset form
            form.reset();
            document.getElementById('branch').value = 'main';
            document.getElementById('testsDirectory').value = 'tests/';
        }
        
        repositoryModal.classList.remove('hidden');
        toggleUsernameField();
    }

    // Hide modal
    function hideModal() {
        repositoryModal.classList.add('hidden');
        repositoryForm.reset();
    }

    // Handle form submission
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            repository_url: document.getElementById('repositoryUrl').value,
            repository_type: document.getElementById('repositoryType').value,
            branch: document.getElementById('branch').value,
            framework: document.getElementById('framework').value,
            tests_directory: document.getElementById('testsDirectory').value,
            access_token: document.getElementById('accessToken').value,
        };

        if (formData.repository_type === 'bitbucket') {
            formData.username = document.getElementById('username').value;
        }

        const repositoryId = document.getElementById('repositoryId').value;
        const url = repositoryId ? 
            `/api/automation-projects/${repositoryId}/` : 
            '/api/automation-projects/';
        const method = repositoryId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to save repository');

            hideModal();
            fetchRepositories();
            showSuccess('Repository saved successfully');
        } catch (error) {
            console.error('Error saving repository:', error);
            showError('Failed to save repository');
        }
    }

    // Sync repository
    async function syncRepository(id) {
        try {
            const response = await fetch(`/api/automation-projects/${id}/sync/`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to sync repository');

            fetchRepositories();
            showSuccess('Repository synced successfully');
        } catch (error) {
            console.error('Error syncing repository:', error);
            showError('Failed to sync repository');
        }
    }

    // Edit repository
    async function editRepository(id) {
        try {
            const response = await fetch(`/api/automation-projects/${id}/`);
            const repository = await response.json();
            showModal(repository);
        } catch (error) {
            console.error('Error fetching repository:', error);
            showError('Failed to load repository details');
        }
    }

    // Delete repository
    async function deleteRepository(id) {
        if (!confirm('Are you sure you want to delete this repository?')) return;

        try {
            const response = await fetch(`/api/automation-projects/${id}/`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete repository');

            fetchRepositories();
            showSuccess('Repository deleted successfully');
        } catch (error) {
            console.error('Error deleting repository:', error);
            showError('Failed to delete repository');
        }
    }

    // Run test
    async function runTest(testId) {
        try {
            const response = await fetch(`/api/automation-tests/${testId}/run/`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to run test');

            showSuccess('Test started successfully');
        } catch (error) {
            console.error('Error running test:', error);
            showError('Failed to run test');
        }
    }

    // Show success message
    function showSuccess(message) {
        // Implement your preferred notification system
        alert(message);
    }

    // Show error message
    function showError(message) {
        // Implement your preferred notification system
        alert(message);
    }

    // Initialize
    fetchRepositories();
});

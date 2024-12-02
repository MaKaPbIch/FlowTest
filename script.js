async function fetchProjects() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/projects/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const projects = await response.json();
        updateProjectSelector(projects);
        displayProjects(projects);
    } catch (error) {
        console.error('Ошибка при получении проектов:', error);
        document.getElementById('projects-container').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    Произошла ошибка при загрузке проектов. Пожалуйста, попробуйте позже.
                </div>
            </div>
        `;
    }
}

function updateProjectSelector(projects) {
    const selector = document.getElementById('projectSelector');
    const defaultOption = selector.firstElementChild;
    selector.innerHTML = '';
    selector.appendChild(defaultOption);
    
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        selector.appendChild(option);
    });
}

function displayProjects(projects, selectedProjectId = null) {
    const container = document.getElementById('projects-container');
    const filteredProjects = selectedProjectId 
        ? projects.filter(project => project.id === parseInt(selectedProjectId))
        : projects;

    container.innerHTML = filteredProjects.map(project => `
        <div class="col-md-6 col-lg-4">
            <div class="card project-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${project.name}</h5>
                    <p class="card-text">${project.description || 'Описание отсутствует'}</p>
                    <p class="card-text">
                        <small class="text-muted">
                            Статус: ${project.status}<br>
                            Создан: ${new Date(project.created_at).toLocaleDateString()}
                        </small>
                    </p>
                </div>
                <div class="card-footer bg-transparent">
                    <small class="text-muted">
                        Обновлено: ${new Date(project.updated_at).toLocaleDateString()}
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

// Загружаем проекты при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    fetchProjects();
    
    // Добавляем обработчик изменения селектора
    document.getElementById('projectSelector').addEventListener('change', (event) => {
        const selectedProjectId = event.target.value;
        fetchProjects().then(() => {
            const projects = Array.from(document.getElementById('projectSelector').options)
                .map(option => ({
                    id: parseInt(option.value),
                    name: option.textContent,
                }))
                .filter(project => project.id);
            displayProjects(projects, selectedProjectId);
        });
    });
});

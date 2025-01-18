import requests

API_URL = "http://localhost:8000/api"

# Получаем новый токен
auth_response = requests.post(f"{API_URL}/token/", json={
    "username": "admin",
    "password": "admin"
})

if auth_response.status_code == 200:
    token = auth_response.json()["access"]
    
    # Используем токен для получения списка проектов
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    projects_response = requests.get(f"{API_URL}/projects/", headers=headers)
    print(f"Status code: {projects_response.status_code}")
    if projects_response.status_code == 200:
        projects = projects_response.json()
        print("\nProjects:")
        for project in projects:
            print(f"ID: {project['id']}, Name: {project['name']}")

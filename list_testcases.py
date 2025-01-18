import requests
import json

API_URL = "http://localhost:8000/api"

# Получаем новый токен
auth_response = requests.post(f"{API_URL}/token/", json={
    "username": "admin",
    "password": "admin"
})

if auth_response.status_code == 200:
    token = auth_response.json()["access"]
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Получаем тест-кейсы для проекта с ID 1 (TestProject)
    response = requests.get(f"{API_URL}/testcases/", headers=headers)
    print(f"Status code: {response.status_code}")
    if response.status_code == 200:
        testcases = response.json()
        print("\nTest Cases:")
        for test in testcases:
            print(f"ID: {test.get('id')}, Title: {test.get('title')}, Project: {test.get('project')}")
            print(f"Test Code: {test.get('test_code')[:100]}...")  # Показываем только начало кода
            print("-" * 80)
else:
    print("Failed to get token:", auth_response.status_code)
    print(auth_response.text)

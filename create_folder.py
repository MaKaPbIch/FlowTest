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
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    folder_data = {
        "name": "UI Tests",
        "project": 1
    }

    response = requests.post(f"{API_URL}/folders/", headers=headers, json=folder_data)
    print(f"Status code: {response.status_code}")
    try:
        folder = response.json()
        print(f"Folder created: {json.dumps(folder, indent=2)}")
        
        # Обновляем тест-кейс, привязывая его к папке
        test_case_data = {
            "folder": folder["id"]
        }
        
        update_response = requests.patch(
            f"{API_URL}/testcases/14/", 
            headers=headers, 
            json=test_case_data
        )
        print(f"\nUpdate status code: {update_response.status_code}")
        print(f"Updated test case: {json.dumps(update_response.json(), indent=2)}")
        
    except:
        print(f"Raw response: {response.text}")
else:
    print("Failed to get token:", auth_response.status_code)
    print(auth_response.text)

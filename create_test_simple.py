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
    print(f"Got token: {token}")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    test_case_data = {
        "title": "Simple GitHub Test",
        "description": "Simple test case",
        "project": 1,
        "test_code": "def test_github_navigation():\n    pass"
    }

    response = requests.post(f"{API_URL}/testcases/", headers=headers, json=test_case_data)
    print(f"Status code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Raw response: {response.text}")
else:
    print("Failed to get token:", auth_response.status_code)
    print(auth_response.text)

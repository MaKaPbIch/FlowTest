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

    # Получаем тест-кейс
    test_response = requests.get(f"{API_URL}/testcases/14/", headers=headers)
    if test_response.status_code == 200:
        test_case = test_response.json()
        print("Test case code:")
        print(test_case.get('test_code'))
        print("\nChecking test existence...")
        
        # Проверяем существование теста
        check_response = requests.get(f"{API_URL}/check-test-existence/14/", headers=headers)
        print(f"\nStatus code: {check_response.status_code}")
        try:
            print(f"Response: {json.dumps(check_response.json(), indent=2)}")
        except:
            print(f"Raw response: {check_response.text}")
else:
    print("Failed to get token:", auth_response.status_code)
    print(auth_response.text)

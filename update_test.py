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

    test_case_data = {
        "test_code": """from playwright.sync_api import Page, expect

def test_github_navigation(page: Page):
    \"\"\"Test GitHub navigation\"\"\"
    # Go to GitHub
    page.goto("https://github.com")
    
    # Click sign in button
    page.click("text=Sign in")
    
    # Verify we're on the login page
    expect(page).to_have_url("https://github.com/login")
    
    # Verify login form exists
    expect(page.locator("input[name=login]")).to_be_visible()
    expect(page.locator("input[name=password]")).to_be_visible()"""
    }

    response = requests.patch(f"{API_URL}/testcases/14/", headers=headers, json=test_case_data)
    print(f"Status code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Raw response: {response.text}")
else:
    print("Failed to get token:", auth_response.status_code)
    print(auth_response.text)

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
        "title": "GitHub Login Test",
        "description": "Tests the GitHub login page navigation and form validation using Playwright",
        "project": 1,
        "platform": "web",
        "priority": "high",
        "test_type": "automated",
        "estimated_time": 30,
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

    response = requests.post(f"{API_URL}/testcases/", headers=headers, json=test_case_data)
    print(f"Status code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
else:
    print("Failed to get token:", auth_response.status_code)
    print(auth_response.text)

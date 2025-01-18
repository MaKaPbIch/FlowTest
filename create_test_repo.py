import os

# Создаем структуру директорий
base_dir = os.path.join(os.path.dirname(__file__), 'test-repository')
os.makedirs(base_dir, exist_ok=True)

# Создаем директории для разных типов тестов
test_dirs = {
    'pytest_tests': os.path.join(base_dir, 'tests', 'pytest'),
    'unittest_tests': os.path.join(base_dir, 'tests', 'unittest'),
    'robot_tests': os.path.join(base_dir, 'tests', 'robot'),
    'playwright_tests': os.path.join(base_dir, 'tests', 'playwright')
}

for dir_path in test_dirs.values():
    os.makedirs(dir_path, exist_ok=True)

# Создаем pytest тесты
pytest_test = '''import pytest
from datetime import datetime, timedelta

def test_date_operations():
    """Test basic date operations"""
    today = datetime.now()
    tomorrow = today + timedelta(days=1)
    assert tomorrow > today

def test_string_operations():
    """Test string manipulation"""
    text = "Hello, World!"
    assert text.upper() == "HELLO, WORLD!"
    assert text.split(',')[0] == "Hello"

@pytest.mark.parametrize("test_input,expected", [
    ("3+5", 8),
    ("2+4", 6),
    ("6+9", 15),
])
def test_eval(test_input, expected):
    """Test basic arithmetic operations"""
    assert eval(test_input) == expected

def test_list_operations():
    """Test list operations"""
    numbers = [1, 2, 3, 4, 5]
    assert len(numbers) == 5
    assert sum(numbers) == 15
    assert max(numbers) == 5

@pytest.mark.slow
def test_large_operation():
    """Test with large numbers"""
    result = sum(range(1000000))
    assert result == 499999500000
'''

# Создаем unittest тесты
unittest_test = '''import unittest
from datetime import datetime

class TestStringMethods(unittest.TestCase):
    def setUp(self):
        self.test_string = "Python Testing"
    
    def test_upper(self):
        """Test string upper method"""
        self.assertEqual(self.test_string.upper(), "PYTHON TESTING")
    
    def test_split(self):
        """Test string split method"""
        self.assertEqual(self.test_string.split(), ["Python", "Testing"])
    
    def test_strip(self):
        """Test string strip method"""
        padded_string = "  python  "
        self.assertEqual(padded_string.strip(), "python")

class TestDateTimeMethods(unittest.TestCase):
    def test_date_comparison(self):
        """Test datetime comparison"""
        date1 = datetime(2024, 1, 1)
        date2 = datetime(2024, 1, 2)
        self.assertLess(date1, date2)
    
    def test_date_attributes(self):
        """Test datetime attributes"""
        date = datetime(2024, 12, 31, 23, 59, 59)
        self.assertEqual(date.year, 2024)
        self.assertEqual(date.month, 12)
        self.assertEqual(date.day, 31)

if __name__ == '__main__':
    unittest.main()
'''

# Создаем Robot Framework тесты
robot_test = '''*** Settings ***
Documentation     Example test cases using Robot Framework
Library           String
Library           Collections

*** Variables ***
${MESSAGE}        Hello, World!
@{NUMBERS}        1    2    3    4    5

*** Test Cases ***
Test String Operations
    ${upper}=    Convert To Upper Case    ${MESSAGE}
    Should Be Equal    ${upper}    HELLO, WORLD!
    
    ${lower}=    Convert To Lower Case    ${MESSAGE}
    Should Be Equal    ${lower}    hello, world!

Test List Operations
    Length Should Be    ${NUMBERS}    5
    
    ${sum}=    Evaluate    sum(${NUMBERS})
    Should Be Equal As Numbers    ${sum}    15

Test Dictionary Operations
    ${dict}=    Create Dictionary    name=John    age=30    city=New York
    Dictionary Should Contain Key    ${dict}    name
    Dictionary Should Contain Value    ${dict}    30
    
Test Conditions
    ${age}=    Set Variable    20
    Run Keyword If    ${age} >= 18    Log    Adult
    ...    ELSE    Log    Minor
'''

# Создаем Playwright тесты
playwright_test = '''from playwright.sync_api import Page, expect

def test_basic_duckduckgo_search(page: Page):
    """Test DuckDuckGo search functionality"""
    # Navigate to DuckDuckGo
    page.goto("https://www.duckduckgo.com")
    
    # Type into search box
    page.fill("input[name=q]", "Playwright")
    
    # Press Enter
    page.press("input[name=q]", "Enter")
    
    # Assert title contains search term
    expect(page).to_have_title("Playwright at DuckDuckGo")

def test_github_navigation(page: Page):
    """Test GitHub navigation"""
    # Go to GitHub
    page.goto("https://github.com")
    
    # Click sign in button
    page.click("text=Sign in")
    
    # Verify we're on the login page
    expect(page).to_have_url("https://github.com/login")
    
    # Verify login form exists
    expect(page.locator("input[name=login]")).to_be_visible()
    expect(page.locator("input[name=password]")).to_be_visible()

def test_responsive_design(page: Page):
    """Test responsive design by checking different viewport sizes"""
    page.goto("https://www.example.com")
    
    # Test mobile viewport
    page.set_viewport_size({"width": 375, "height": 667})
    expect(page).to_have_title("Example Domain")
    
    # Test tablet viewport
    page.set_viewport_size({"width": 768, "height": 1024})
    expect(page).to_have_title("Example Domain")
    
    # Test desktop viewport
    page.set_viewport_size({"width": 1920, "height": 1080})
    expect(page).to_have_title("Example Domain")
'''

# Записываем тесты в файлы
with open(os.path.join(test_dirs['pytest_tests'], 'test_examples.py'), 'w', encoding='utf-8') as f:
    f.write(pytest_test)

with open(os.path.join(test_dirs['unittest_tests'], 'test_examples.py'), 'w', encoding='utf-8') as f:
    f.write(unittest_test)

with open(os.path.join(test_dirs['robot_tests'], 'test_examples.robot'), 'w', encoding='utf-8') as f:
    f.write(robot_test)

with open(os.path.join(test_dirs['playwright_tests'], 'test_examples.spec.js'), 'w', encoding='utf-8') as f:
    f.write(playwright_test)

# Создаем requirements.txt
requirements = '''pytest>=7.3.1
robotframework>=6.1.1
playwright>=1.36.0
'''

with open(os.path.join(base_dir, 'requirements.txt'), 'w', encoding='utf-8') as f:
    f.write(requirements)

# Создаем README.md
readme = '''# Test Repository Example

This repository contains example tests using different testing frameworks:

## Frameworks Used
- PyTest
- UnitTest
- Robot Framework
- Playwright

## Directory Structure
```
tests/
├── pytest/
│   └── test_examples.py
├── unittest/
│   └── test_examples.py
├── robot/
│   └── test_examples.robot
└── playwright/
    └── test_examples.spec.js
```

## Running Tests

### PyTest
```bash
pytest tests/pytest
```

### UnitTest
```bash
python -m unittest discover tests/unittest
```

### Robot Framework
```bash
robot tests/robot/test_examples.robot
```

### Playwright
```bash
npx playwright test tests/playwright
```
'''

with open(os.path.join(base_dir, 'README.md'), 'w', encoding='utf-8') as f:
    f.write(readme)

print("Test repository created successfully!")

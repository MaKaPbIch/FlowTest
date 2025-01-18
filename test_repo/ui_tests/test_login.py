from playwright.sync_api import expect

def test_login(page):
    # Переходим на страницу логина
    page.goto('http://localhost:8000/login')
    
    # Проверяем заголовок страницы
    expect(page).to_have_title("Login - FlowTest")
    
    # Заполняем форму логина
    page.get_by_label("Username").fill("testuser")
    page.get_by_label("Password").fill("testpass123")
    
    # Делаем скриншот формы логина
    page.screenshot(path="login_form.png")
    
    # Нажимаем кнопку входа
    page.get_by_role("button", name="Login").click()
    
    # Проверяем, что мы перешли на главную страницу
    expect(page).to_have_url("http://localhost:8000/")
    
    # Проверяем, что отображается имя пользователя
    user_element = page.get_by_text("testuser")
    expect(user_element).to_be_visible()
    
    # Делаем скриншот после успешного входа
    page.screenshot(path="after_login.png")

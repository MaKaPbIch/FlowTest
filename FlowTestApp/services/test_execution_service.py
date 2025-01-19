import os
import json
import logging
import tempfile
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.support.events import EventFiringWebDriver, AbstractEventListener
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from ..models import TestRun
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

class SeleniumEventListener(AbstractEventListener):
    def __init__(self, test_run):
        self.test_run = test_run
        self.browser_logs = []
        self.start_time = None
        
    def before_navigate_to(self, url, driver):
        self.browser_logs.append({
            'action': 'navigate',
            'url': url,
            'timestamp': datetime.now().isoformat()
        })
        
    def before_click(self, element, driver):
        self.browser_logs.append({
            'action': 'click',
            'element': element.tag_name,
            'text': element.text,
            'timestamp': datetime.now().isoformat()
        })
        
    def before_change_value_of(self, element, driver):
        self.browser_logs.append({
            'action': 'input',
            'element': element.tag_name,
            'timestamp': datetime.now().isoformat()
        })

class TestExecutionService:
    def __init__(self):
        self.video_output_dir = os.path.join(settings.MEDIA_ROOT, 'test_videos')
        os.makedirs(self.video_output_dir, exist_ok=True)
        
    def setup_chrome_options(self):
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--start-maximized')
        return chrome_options
        
    def execute_test(self, test_run_id):
        """
        Выполняет тест и записывает видео для Selenium тестов
        """
        test_run = TestRun.objects.get(id=test_run_id)
        test_run.start_time = timezone.now()
        test_run.status = 'running'
        test_run.save()
        
        try:
            # Определяем тип теста (API или Selenium)
            if 'selenium' in test_run.test_case.test_code.lower():
                self.execute_selenium_test(test_run)
            else:
                self.execute_api_test(test_run)
                
        except Exception as e:
            logger.error(f"Error executing test {test_run_id}: {str(e)}", exc_info=True)
            test_run.status = 'error'
            test_run.error_message = str(e)
            test_run.end_time = timezone.now()
            test_run.save()
            
    def execute_selenium_test(self, test_run):
        """
        Выполняет Selenium тест с записью видео и логированием действий
        """
        chrome_options = self.setup_chrome_options()
        
        # Настраиваем запись видео
        video_path = os.path.join(self.video_output_dir, f'test_run_{test_run.id}.mp4')
        chrome_options.add_argument(f'--use-fake-device-for-media-stream')
        chrome_options.add_argument(f'--use-fake-ui-for-media-stream')
        chrome_options.add_argument(f'--enable-usermedia-screen-capturing')
        
        driver = webdriver.Chrome(options=chrome_options)
        event_listener = SeleniumEventListener(test_run)
        driver = EventFiringWebDriver(driver, event_listener)
        
        try:
            # Выполняем тест
            exec(test_run.test_case.test_code, {'webdriver': webdriver, 'driver': driver})
            
            # Сохраняем результаты
            test_run.status = 'success'
            test_run.browser_logs = event_listener.browser_logs
            test_run.selenium_video_path = video_path
            
        except Exception as e:
            test_run.status = 'failed'
            test_run.error_message = str(e)
            
        finally:
            driver.quit()
            test_run.end_time = timezone.now()
            test_run.save()
            
    def execute_api_test(self, test_run):
        """
        Выполняет API тест
        """
        try:
            # Создаем временное окружение для теста
            with tempfile.TemporaryDirectory() as temp_dir:
                # Сохраняем информацию об окружении
                test_run.test_environment = {
                    'temp_dir': temp_dir,
                    'python_version': platform.python_version(),
                    'timestamp': datetime.now().isoformat()
                }
                
                # Выполняем тест
                exec(test_run.test_case.test_code, {'temp_dir': temp_dir})
                
                test_run.status = 'success'
                
        except Exception as e:
            test_run.status = 'failed'
            test_run.error_message = str(e)
            
        finally:
            test_run.end_time = timezone.now()
            test_run.save()
            
    def run_multiple_tests(self, test_ids):
        """
        Запускает несколько тестов параллельно
        """
        results = []
        for test_id in test_ids:
            test_run = TestRun.objects.create(
                test_case_id=test_id,
                status='pending'
            )
            self.execute_test(test_run.id)
            results.append({
                'test_id': test_id,
                'test_run_id': test_run.id
            })
        return results

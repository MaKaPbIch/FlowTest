import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'FlowTest.settings')

app = Celery('FlowTest')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Configure Celery
# Использовать Redis в качестве брокера и бэкенда результатов
app.conf.broker_url = 'redis://localhost:6379/0'
app.conf.result_backend = 'redis://localhost:6379/1'

# Настройки для Windows
# app.conf.broker_connection_retry_on_startup = True
# app.conf.worker_pool_restarts = True

# Load task modules from all registered Django apps.
app.autodiscover_tasks(['FlowTestApp'])

# Явно импортируем tasks после инициализации Django
# import FlowTestApp.tasks

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

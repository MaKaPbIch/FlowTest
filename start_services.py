import os
import subprocess
import sys
import time
import signal
import psutil

def is_port_in_use(port):
    """Check if a port is in use"""
    for conn in psutil.net_connections():
        if conn.laddr.port == port:
            return True
    return False

def start_redis():
    """Start Redis if not already running"""
    if not is_port_in_use(6379):
        print("Starting Redis...")
        # Запускаем Redis в фоновом режиме
        redis = subprocess.Popen(
            ["redis-server"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        time.sleep(2)  # Даем Redis время на запуск
        return redis
    print("Redis already running")
    return None

def start_celery():
    """Start Celery worker"""
    print("Starting Celery worker...")
    # Запускаем Celery в фоновом режиме
    celery = subprocess.Popen(
        ["celery", "-A", "FlowTest", "worker", "--pool=solo", "--loglevel=info"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NO_WINDOW
    )
    return celery

def start_django():
    """Start Django development server"""
    print("Starting Django server...")
    django = subprocess.Popen(
        [sys.executable, "manage.py", "runserver"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    return django

def cleanup(processes):
    """Cleanup processes on exit"""
    for process in processes:
        if process:
            if sys.platform == 'win32':
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(process.pid)])
            else:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)

def main():
    processes = []
    try:
        # Запускаем сервисы
        redis_process = start_redis()
        if redis_process:
            processes.append(redis_process)
        
        celery_process = start_celery()
        processes.append(celery_process)
        
        django_process = start_django()
        processes.append(django_process)
        
        # Ждем прерывания от пользователя
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nStopping all services...")
    finally:
        cleanup(processes)

if __name__ == "__main__":
    main()

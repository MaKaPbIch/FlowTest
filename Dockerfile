# Используем официальный образ Python
FROM python:3.12-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Установка рабочей директории
WORKDIR /app

# Копирование файлов проекта
COPY requirements.txt .
COPY . .

# Установка зависимостей Python
RUN pip install --no-cache-dir -r requirements.txt

# Установка Playwright browsers
RUN playwright install

# Создание директории для хранения репозиториев
RUN mkdir -p automation_projects

# Запуск команды по умолчанию
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

#!/bin/bash
echo "Объединение конфликтующих миграций..."
python3 manage.py makemigrations --merge
echo ""
echo "Обновление системы разрешений FlowTest..."
python3 manage.py migrate
echo ""
echo "Миграция выполнена успешно!"
echo "Новая система разрешений установлена."
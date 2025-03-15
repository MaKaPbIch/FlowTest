@echo off
echo Объединение конфликтующих миграций...
python manage.py makemigrations --merge
echo.
echo Обновление системы разрешений FlowTest...
python manage.py migrate
echo.
echo Миграция выполнена успешно!
echo Новая система разрешений установлена.
pause
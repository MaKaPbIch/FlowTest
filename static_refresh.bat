@echo off
echo Stopping any running Django servers...
taskkill /F /IM python.exe /T 2>nul
 
echo Collecting static files...
python manage.py collectstatic --noinput

echo Clearing browser cache...
echo Please manually clear your browser cache by pressing Ctrl+F5 on the admin site

echo Done! Now restart your Django server.
pause
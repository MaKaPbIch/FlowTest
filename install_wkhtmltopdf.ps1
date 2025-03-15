# URL для скачивания wkhtmltopdf
$url = "https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6-1/wkhtmltox-0.12.6-1.msvc2015-win64.exe"
$output = "wkhtmltopdf_installer.exe"

# Скачиваем установщик
Write-Host "Downloading wkhtmltopdf..."
Invoke-WebRequest -Uri $url -OutFile $output

# Запускаем установку
Write-Host "Installing wkhtmltopdf..."
Start-Process -FilePath $output -ArgumentList "/S" -Wait

# Удаляем установщик
Remove-Item $output

Write-Host "Installation completed!"

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'FlowTest.settings')
django.setup()

from FlowTestApp.models import Permission

# Получаем все текущие разрешения в системе
permissions = Permission.objects.all().order_by('category', 'name')

print("Current permissions:")
print("-" * 50)
for perm in permissions:
    print(f"{perm.id} | {perm.category} | {perm.name} | {perm.codename}")
print("-" * 50)
print(f"Total: {permissions.count()} permissions")
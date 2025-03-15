import os
import django
import logging

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'FlowTest.settings')
django.setup()

from django.contrib.auth.models import Permission as DjangoPermission
from django.contrib.contenttypes.models import ContentType

logger = logging.getLogger('django')

def clean_permissions():
    """
    Удаляет все лишние стандартные разрешения Django,
    оставляя только необходимые для работы системы
    """
    # Удалить все стандартные права Django
    auth_deleted = DjangoPermission.objects.filter(
        content_type__app_label='auth'
    ).delete()
    
    admin_deleted = DjangoPermission.objects.filter(
        content_type__app_label='admin'
    ).delete()
    
    # Удалить все разрешения для моделей FlowTestApp
    content_types = ContentType.objects.filter(app_label='FlowTestApp')
    app_deleted = DjangoPermission.objects.filter(
        content_type__in=content_types
    ).delete()
    
    # Удалить все разрешения для других приложений
    other_deleted = DjangoPermission.objects.exclude(
        content_type__app_label__in=['auth', 'admin', 'FlowTestApp']
    ).delete()
    
    print(f"Удалено:")
    print(f"- Разрешения auth: {auth_deleted[0] if isinstance(auth_deleted, tuple) else auth_deleted}")
    print(f"- Разрешения admin: {admin_deleted[0] if isinstance(admin_deleted, tuple) else admin_deleted}")
    print(f"- Разрешения FlowTestApp: {app_deleted[0] if isinstance(app_deleted, tuple) else app_deleted}")
    print(f"- Другие разрешения: {other_deleted[0] if isinstance(other_deleted, tuple) else other_deleted}")
    print("Ненужные стандартные разрешения Django успешно удалены.")

if __name__ == "__main__":
    clean_permissions()
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'FlowTest.settings')
django.setup()

from django.contrib.auth.models import Permission as DjangoPermission
from django.contrib.contenttypes.models import ContentType
from django.db import connection
import logging

logger = logging.getLogger('django')

def remove_django_permissions():
    """
    Удаляет все стандартные разрешения Django, которые больше не нужны в системе.
    """
    # Получаем количество разрешений до удаления
    total_before = DjangoPermission.objects.count()
    print(f"Количество разрешений до удаления: {total_before}")
    
    # Удаляем разрешения из приложения auth
    auth_deleted = DjangoPermission.objects.filter(
        content_type__app_label='auth'
    ).delete()
    
    # Удаляем разрешения из приложения admin
    admin_deleted = DjangoPermission.objects.filter(
        content_type__app_label='admin'
    ).delete()
    
    # Удаляем разрешения из FlowTestApp
    app_deleted = DjangoPermission.objects.filter(
        content_type__app_label='FlowTestApp'
    ).delete()
    
    # Удаляем разрешения из содержимого и сессий
    content_deleted = DjangoPermission.objects.filter(
        content_type__app_label='contenttypes'
    ).delete()
    
    sessions_deleted = DjangoPermission.objects.filter(
        content_type__app_label='sessions'
    ).delete()
    
    # Получаем количество разрешений после удаления
    total_after = DjangoPermission.objects.count()
    
    # Выводим результаты
    print(f"Результаты очистки разрешений:")
    print(f"  - auth: {auth_deleted[0] if isinstance(auth_deleted, tuple) else auth_deleted}")
    print(f"  - admin: {admin_deleted[0] if isinstance(admin_deleted, tuple) else admin_deleted}")
    print(f"  - FlowTestApp: {app_deleted[0] if isinstance(app_deleted, tuple) else app_deleted}")
    print(f"  - contenttypes: {content_deleted[0] if isinstance(content_deleted, tuple) else content_deleted}")
    print(f"  - sessions: {sessions_deleted[0] if isinstance(sessions_deleted, tuple) else sessions_deleted}")
    print(f"Количество разрешений после удаления: {total_after}")
    print(f"Удалено {total_before - total_after} разрешений")
    
    # Сбрасываем последовательность id в таблице разрешений
    with connection.cursor() as cursor:
        try:
            # Проверяем, использует ли база PostgreSQL
            cursor.execute("SELECT 1 FROM pg_tables WHERE tablename = 'auth_permission'")
            is_postgres = cursor.fetchone() is not None
            
            if is_postgres:
                # Для PostgreSQL
                cursor.execute("SELECT MAX(id) FROM auth_permission")
                result = cursor.fetchone()
                max_id = result[0] if result[0] else 0
                cursor.execute(f"ALTER SEQUENCE auth_permission_id_seq RESTART WITH {max_id + 1}")
                print(f"Сброшена последовательность ID в таблице auth_permission на {max_id + 1}")
            else:
                # Для SQLite или других баз
                print("Сброс последовательности не требуется для текущей базы данных")
        except Exception as e:
            print(f"Ошибка при сбросе последовательности: {e}")

if __name__ == "__main__":
    remove_django_permissions()
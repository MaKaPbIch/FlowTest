from django.db import migrations
from FlowTestApp.migrations.data.permissions import PERMISSIONS, DEFAULT_ROLES

def create_permissions(apps, schema_editor):
    """
    Создаем все необходимые разрешения
    """
    Permission = apps.get_model('FlowTestApp', 'Permission')
    
    # Сначала удаляем все существующие разрешения
    Permission.objects.all().delete()
    
    # Создаем новые разрешения
    for perm_data in PERMISSIONS:
        Permission.objects.create(
            name=perm_data['name'],
            codename=perm_data['codename'],
            description=perm_data['description'],
            category=perm_data['category']
        )
    
    print(f"Созданы {len(PERMISSIONS)} разрешения")

def create_default_roles(apps, schema_editor):
    """
    Создаем предопределенные роли с соответствующими разрешениями
    """
    Role = apps.get_model('FlowTestApp', 'Role')
    Permission = apps.get_model('FlowTestApp', 'Permission')
    
    # Удаляем существующие роли, чтобы избежать дублирования
    Role.objects.all().delete()
    
    # Создаем роли
    for role_data in DEFAULT_ROLES:
        role = Role.objects.create(
            name=role_data['name'],
            description=role_data['description'],
            is_admin_role=role_data['is_admin_role']
        )
        
        # Назначаем разрешения
        if role_data['permissions'] == '*':
            # Все разрешения для администратора
            all_permissions = Permission.objects.all()
            role.permissions.add(*all_permissions)
        else:
            # Только указанные разрешения для роли
            for codename in role_data['permissions']:
                try:
                    perm = Permission.objects.get(codename=codename)
                    role.permissions.add(perm)
                except Permission.DoesNotExist:
                    print(f"Предупреждение: Разрешение с кодом {codename} не найдено")
    
    print(f"Созданы {len(DEFAULT_ROLES)} роли с соответствующими разрешениями")

class Migration(migrations.Migration):

    dependencies = [
        ('FlowTestApp', '0035_permission_role_is_admin_role_role_permissions'),
    ]

    operations = [
        migrations.RunPython(create_permissions),
        migrations.RunPython(create_default_roles),
    ]
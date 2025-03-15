from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from FlowTestApp.models import Role, Permission
from django.db.models import Count

User = get_user_model()

class Command(BaseCommand):
    help = 'Check for duplicate users, roles, and permissions'

    def handle(self, *args, **options):
        # Check for duplicate users
        self.stdout.write(self.style.HEADING('Checking for duplicate users...'))
        duplicate_users = User.objects.values('username').annotate(
            count=Count('id')).filter(count__gt=1)
        
        if duplicate_users:
            self.stdout.write(self.style.ERROR(
                f'Found {len(duplicate_users)} duplicate usernames:'))
            for user in duplicate_users:
                self.stdout.write(f"  - {user['username']} ({user['count']} occurrences)")
                # Get all users with this username
                users = User.objects.filter(username=user['username'])
                for i, u in enumerate(users):
                    self.stdout.write(f"    #{i+1}: ID={u.id}, email={u.email}, is_active={u.is_active}")
        else:
            self.stdout.write(self.style.SUCCESS('No duplicate users found.'))

        # Check for duplicate roles
        self.stdout.write(self.style.HEADING('\nChecking for duplicate roles...'))
        duplicate_roles = Role.objects.values('name').annotate(
            count=Count('id')).filter(count__gt=1)
        
        if duplicate_roles:
            self.stdout.write(self.style.ERROR(
                f'Found {len(duplicate_roles)} duplicate role names:'))
            for role in duplicate_roles:
                self.stdout.write(f"  - {role['name']} ({role['count']} occurrences)")
                # Get all roles with this name
                roles = Role.objects.filter(name=role['name'])
                for i, r in enumerate(roles):
                    self.stdout.write(f"    #{i+1}: ID={r.id}, is_admin={r.is_admin_role}")
        else:
            self.stdout.write(self.style.SUCCESS('No duplicate roles found.'))

        # Check for duplicate permissions
        self.stdout.write(self.style.HEADING('\nChecking for duplicate permissions...'))
        duplicate_perms = Permission.objects.values('codename').annotate(
            count=Count('id')).filter(count__gt=1)
        
        if duplicate_perms:
            self.stdout.write(self.style.ERROR(
                f'Found {len(duplicate_perms)} duplicate permission codenames:'))
            for perm in duplicate_perms:
                self.stdout.write(f"  - {perm['codename']} ({perm['count']} occurrences)")
                # Get all permissions with this codename
                perms = Permission.objects.filter(codename=perm['codename'])
                for i, p in enumerate(perms):
                    self.stdout.write(f"    #{i+1}: ID={p.id}, name={p.name}, category={p.category}")
        else:
            self.stdout.write(self.style.SUCCESS('No duplicate permissions found.'))
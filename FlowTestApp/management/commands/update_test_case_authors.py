from django.core.management.base import BaseCommand
from FlowTestApp.models import TestCase, CustomUser

class Command(BaseCommand):
    help = 'Updates test case authors for existing test cases'

    def handle(self, *args, **options):
        # Получаем первого пользователя (предполагаем, что это админ)
        try:
            admin_user = CustomUser.objects.first()
            if not admin_user:
                self.stdout.write(self.style.ERROR('No users found in the database'))
                return
                
            # Обновляем все тест-кейсы без автора
            updated = TestCase.objects.filter(author__isnull=True).update(author=admin_user)
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully updated {updated} test cases with author {admin_user.username}')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error updating test cases: {str(e)}')
            )

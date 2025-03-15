from FlowTestApp.models import TestCase, CustomUser

# Получаем первого пользователя (предполагаем, что это админ)
admin_user = CustomUser.objects.first()
if admin_user:
    # Обновляем все тест-кейсы без автора
    updated = TestCase.objects.filter(author__isnull=True).update(author=admin_user)
    print(f'Successfully updated {updated} test cases with author {admin_user.username}')

from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver
from django.contrib.auth.models import Permission as DjangoPermission
from django.contrib.contenttypes.models import ContentType
from .models import AutomationTest
import logging

logger = logging.getLogger('django')

@receiver(post_save, sender=AutomationTest)
def log_test_status_change(sender, instance, **kwargs):
    """
    Monitor AutomationTest status changes and log important events.
    """
    if hasattr(instance, 'status') and instance.status in ['different', 'not_found']:
        # Log the status change instead of creating a notification
        logger.info(
            f"Test {instance.name} needs attention - status: {instance.status}"
        )

@receiver(post_migrate)
def remove_default_permissions(sender, **kwargs):
    """
    Удаляет стандартные права доступа Django после миграции,
    оставляя только права для модели кастомного Permission
    """
    if sender.name == 'FlowTestApp':
        # Удалить все стандартные права Django
        DjangoPermission.objects.filter(
            content_type__app_label='auth'
        ).delete()
        
        DjangoPermission.objects.filter(
            content_type__app_label='admin'
        ).delete()
        
        # Удалить все разрешения для моделей FlowTestApp 
        content_types = ContentType.objects.filter(app_label='FlowTestApp')
        
        DjangoPermission.objects.filter(
            content_type__in=content_types
        ).delete()
        
        logger.info("Ненужные стандартные разрешения Django успешно удалены.")
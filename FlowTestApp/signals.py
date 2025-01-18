from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import AutomatedTest

@receiver(post_save, sender=AutomatedTest)
def notify_test_status_change(sender, instance, **kwargs):
    if instance.status in ['different', 'not_found']:
        Notification.objects.create(
            user=instance.test_case.folder.project.owner,
            title=f"Test {instance.test_name} needs attention",
            message=f"The test code in test case differs from the source code in automation project",
            notification_type='test_sync',
            related_object_id=instance.id
        ) 
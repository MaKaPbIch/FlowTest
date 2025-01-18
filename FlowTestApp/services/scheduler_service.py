from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from ..models import SchedulerEvent
from .batch_test_runner import BatchTestRunner

class SchedulerService:
    def __init__(self):
        self.batch_runner = BatchTestRunner()

    def process_due_events(self):
        """
        Обрабатывает все события, которые должны быть выполнены
        """
        # Получаем все события, которые должны быть выполнены
        now = timezone.now()
        due_events = SchedulerEvent.objects.filter(
            Q(scheduled_time__lte=now, status='pending') |
            Q(recurrence__in=['daily', 'weekly', 'monthly'],
              last_run__isnull=True,
              scheduled_time__lte=now) |
            Q(recurrence='daily',
              last_run__lt=now - timedelta(days=1)) |
            Q(recurrence='weekly',
              last_run__lt=now - timedelta(weeks=1)) |
            Q(recurrence='monthly',
              last_run__lt=now - timedelta(days=30))
        )

        for event in due_events:
            self.process_event(event)

    def process_event(self, event: SchedulerEvent):
        """
        Обрабатывает отдельное событие
        """
        try:
            # Пропускаем не тестовые события
            if event.event_type != 'run_tests':
                return

            # Обновляем статус
            event.status = 'running'
            event.save()

            # Запускаем тесты
            results = self.batch_runner.run_scheduled_tests(event)

            # Обрабатываем результаты
            success = all(r['result'].get('success', False) for r in results)
            
            # Обновляем событие
            event.status = 'completed' if success else 'failed'
            event.last_run = timezone.now()
            
            # Если это повторяющееся событие, создаем следующее
            if event.recurrence != 'none':
                self._schedule_next_event(event)
            
            event.save()

        except Exception as e:
            print(f"Error processing event {event.id}: {str(e)}")
            event.status = 'failed'
            event.save()

    def _schedule_next_event(self, event: SchedulerEvent):
        """
        Планирует следующее событие для повторяющихся событий
        """
        next_time = event.scheduled_time
        
        if event.recurrence == 'daily':
            next_time = next_time + timedelta(days=1)
        elif event.recurrence == 'weekly':
            next_time = next_time + timedelta(weeks=1)
        elif event.recurrence == 'monthly':
            next_time = next_time + timedelta(days=30)
        
        SchedulerEvent.objects.create(
            title=event.title,
            description=event.description,
            event_type=event.event_type,
            scheduled_time=next_time,
            recurrence=event.recurrence,
            project=event.project,
            parent_event=event,
            test_config=event.test_config
        )

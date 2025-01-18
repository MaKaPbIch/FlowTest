import concurrent.futures
from typing import List, Dict, Optional
from django.db.models import Q
from ..models import TestCase, Project, SchedulerEvent
from .test_runner import TestRunner

class BatchTestRunner:
    def __init__(self, max_workers: int = 3):
        """
        Инициализация сервиса для массового запуска тестов
        :param max_workers: Максимальное количество параллельных запусков
        """
        self.max_workers = max_workers

    def run_tests(self, test_cases: List[TestCase]) -> List[Dict]:
        """
        Запускает список тестов параллельно
        """
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_test = {
                executor.submit(self._run_single_test, test_case): test_case 
                for test_case in test_cases
            }
            
            for future in concurrent.futures.as_completed(future_to_test):
                test_case = future_to_test[future]
                try:
                    result = future.result()
                    results.append({
                        'test_case': test_case,
                        'result': result
                    })
                except Exception as e:
                    results.append({
                        'test_case': test_case,
                        'result': {
                            'success': False,
                            'error': str(e)
                        }
                    })
        
        return results

    def _run_single_test(self, test_case: TestCase) -> Optional[Dict]:
        """
        Запускает отдельный тест
        """
        runner = TestRunner(test_case)
        return runner.run()

    def run_project_tests(self, project: Project) -> List[Dict]:
        """
        Запускает все автоматизированные тесты проекта
        """
        test_cases = TestCase.objects.filter(
            folder__project=project,
            test_type='automated',
            automationscript__isnull=False
        )
        return self.run_tests(test_cases)

    def run_folder_tests(self, folder_id: int) -> List[Dict]:
        """
        Запускает все автоматизированные тесты в папке и подпапках
        """
        test_cases = TestCase.objects.filter(
            Q(folder_id=folder_id) | Q(folder__parent_folder_id=folder_id),
            test_type='automated',
            automationscript__isnull=False
        )
        return self.run_tests(test_cases)

    def run_scheduled_tests(self, event: SchedulerEvent) -> List[Dict]:
        """
        Запускает тесты по расписанию
        """
        if not hasattr(event, 'test_config') or not event.test_config:
            return []

        config = event.test_config
        
        # Получаем тесты в зависимости от конфигурации
        if config.get('run_all_project_tests', False):
            test_cases = TestCase.objects.filter(
                folder__project=event.project,
                test_type='automated',
                automationscript__isnull=False
            )
        elif config.get('folder_id'):
            test_cases = TestCase.objects.filter(
                Q(folder_id=config['folder_id']) | 
                Q(folder__parent_folder_id=config['folder_id']),
                test_type='automated',
                automationscript__isnull=False
            )
        elif config.get('test_cases'):
            test_cases = TestCase.objects.filter(
                id__in=config['test_cases'],
                test_type='automated',
                automationscript__isnull=False
            )
        else:
            return []

        return self.run_tests(test_cases)

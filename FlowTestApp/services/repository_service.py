import os
from pathlib import Path
from FlowTestApp.models import TestCase

class RepositoryService:
    @staticmethod
    def check_test_existence(test_case_id):
        """
        Проверяет наличие теста в репозитории и наличие кода теста
        """
        try:
            test_case = TestCase.objects.get(id=test_case_id)
            
            # Получаем путь к репозиторию из настроек
            repo_path = os.getenv('REPOSITORY_PATH', './test-repository')
            
            # Если нет кода теста, сразу возвращаем False
            if not test_case.test_code:
                return {
                    'exists': False,
                    'has_code': False
                }
            
            # Если есть код теста, считаем что тест существует
            return {
                'exists': True,
                'has_code': True
            }
            
        except TestCase.DoesNotExist:
            return {
                'exists': False,
                'has_code': False
            }
        except Exception as e:
            print(f"Error checking test existence: {str(e)}")
            return {
                'exists': False,
                'has_code': False
            }

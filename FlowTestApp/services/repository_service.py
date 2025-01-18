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
            
            # Извлекаем имя функции теста из кода
            import re
            test_name_match = re.search(r'def\s+(\w+)', test_case.test_code)
            if not test_name_match:
                return {
                    'exists': False,
                    'has_code': False
                }
            
            test_name = test_name_match.group(1)
            
            # Ищем тест во всех файлах репозитория
            exists = False
            has_code = False
            
            for root, _, files in os.walk(repo_path):
                for file in files:
                    if file.endswith(('.py', '.spec.js')):  # Поддерживаем Python и JavaScript тесты
                        file_path = Path(root) / file
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                if test_name in content:  # Если имя теста найдено в файле
                                    exists = True
                                    has_code = True
                                    break
                        except Exception as e:
                            print(f"Error reading file {file_path}: {str(e)}")
                            continue
                
                if exists:  # Если тест найден, прекращаем поиск
                    break
            
            return {
                'exists': exists,
                'has_code': has_code
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

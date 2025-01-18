import os
import shutil
import subprocess
import git
from ..models import AutomationProject, AutomationTest
from datetime import datetime
from django.conf import settings
import ast
import re

class AutomationService:
    def __init__(self):
        self.base_path = settings.AUTOMATION_PROJECTS_DIR

    def sync_repository(self, project: AutomationProject):
        """Синхронизация репозитория и обновление тестов"""
        repo_path = os.path.join(self.base_path, str(project.id))
        
        try:
            # Получаем URL с учетом аутентификации
            repo_url = project.get_repository_url_with_auth()
            
            # Клонируем или обновляем репозиторий
            if not os.path.exists(repo_path):
                os.makedirs(repo_path)
                git.Repo.clone_from(repo_url, repo_path)
            else:
                repo = git.Repo(repo_path)
                # Обновляем URL удаленного репозитория с учетом аутентификации
                with repo.config_writer() as config:
                    config.set_value('remote "origin"', 'url', repo_url)
                repo.remotes.origin.pull()
                if repo.active_branch.name != project.branch:
                    repo.git.checkout(project.branch)

            # Сканируем тесты
            tests = self.scan_tests(project, repo_path)
            
            # Обновляем статус проекта
            project.last_sync = datetime.now()
            project.sync_status = 'synced'
            project.local_path = repo_path
            project.save()

            return {'status': 'success', 'tests': tests}
        except git.exc.GitCommandError as e:
            project.sync_status = 'error'
            project.save()
            if 'Authentication failed' in str(e):
                raise Exception("Authentication failed. Please check your access token.")
            raise Exception(f"Git error: {str(e)}")
        except Exception as e:
            project.sync_status = 'error'
            project.save()
            raise Exception(f"Failed to sync repository: {str(e)}")

    def scan_tests(self, project: AutomationProject, repo_path: str):
        """Сканирование тестов в репозитории"""
        tests_path = os.path.join(repo_path, project.tests_directory)
        if not os.path.exists(tests_path):
            raise Exception(f"Tests directory {project.tests_directory} not found")

        test_files = []
        for root, _, files in os.walk(tests_path):
            for file in files:
                if self._is_test_file(file, project.framework):
                    test_files.append(os.path.join(root, file))

        # Получаем существующие тесты из базы
        existing_tests = {test.name: test for test in project.tests.all()}
        
        # Анализируем каждый файл с тестами
        for test_file in test_files:
            test_cases = self._extract_test_cases(test_file, project.framework)
            for test_name in test_cases:
                if test_name in existing_tests:
                    # Обновляем существующий тест
                    test = existing_tests[test_name]
                    test.file_path = os.path.relpath(test_file, repo_path)
                    test.is_available = True
                    test.save()
                else:
                    # Создаем новый тест
                    AutomationTest.objects.create(
                        project=project,
                        name=test_name,
                        file_path=os.path.relpath(test_file, repo_path),
                        is_available=True
                    )

        # Помечаем отсутствующие тесты как недоступные
        for test in existing_tests.values():
            if test.file_path not in [os.path.relpath(f, repo_path) for f in test_files]:
                test.is_available = False
                test.save()

        return project.tests.all()

    def _is_test_file(self, filename: str, framework: str) -> bool:
        """Проверка, является ли файл тестовым"""
        if framework == 'pytest':
            return filename.startswith('test_') and filename.endswith('.py')
        elif framework == 'unittest':
            return filename.endswith('_test.py') or filename.endswith('Test.py')
        elif framework == 'robot':
            return filename.endswith('.robot')
        elif framework == 'playwright':
            return filename.endswith('.spec.js') or filename.endswith('.test.js')
        return False

    def _extract_test_cases(self, file_path: str, framework: str) -> list:
        """Извлечение тестовых случаев из файла"""
        if framework in ['pytest', 'unittest']:
            return self._extract_python_tests(file_path)
        elif framework == 'robot':
            return self._extract_robot_tests(file_path)
        elif framework == 'playwright':
            return self._extract_playwright_tests(file_path)
        return []

    def _extract_python_tests(self, file_path: str) -> list:
        """Извлечение тестов из Python файла"""
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                tree = ast.parse(f.read())
                tests = []
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef) and (
                        node.name.startswith('test_') or 
                        node.name.startswith('should_') or
                        'test' in [d.id for d in node.decorator_list if isinstance(d, ast.Name)]
                    ):
                        tests.append(node.name)
                return tests
            except:
                return []

    def _extract_robot_tests(self, file_path: str) -> list:
        """Извлечение тестов из Robot Framework файла"""
        tests = []
        with open(file_path, 'r', encoding='utf-8') as f:
            current_test = None
            for line in f:
                if line.strip().lower().startswith('*** test cases ***'):
                    current_test = True
                elif current_test and line.strip() and not line.startswith(' '):
                    tests.append(line.strip())
        return tests

    def _extract_playwright_tests(self, file_path: str) -> list:
        """Извлечение тестов из Playwright файла"""
        tests = []
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Ищем test('name', ...) или test("name", ...)
            test_matches = re.finditer(r"test\(['\"](.+?)['\"]", content)
            tests.extend(match.group(1) for match in test_matches)
        return tests

    def run_tests(self, project: AutomationProject, test_ids: list = None):
        """Запуск выбранных тестов"""
        if not test_ids:
            return self.run_all_tests(project)

        tests = AutomationTest.objects.filter(id__in=test_ids, project=project, is_available=True)
        if not tests:
            raise Exception("No available tests found")

        return self._execute_tests(project, tests)

    def run_all_tests(self, project: AutomationProject):
        """Запуск всех доступных тестов"""
        tests = project.tests.filter(is_available=True)
        if not tests:
            raise Exception("No available tests found")

        return self._execute_tests(project, tests)

    def _execute_tests(self, project: AutomationProject, tests):
        """Выполнение тестов"""
        if not project.local_path or not os.path.exists(project.local_path):
            raise Exception("Repository not synced")

        if project.framework == 'pytest':
            return self._run_pytest(project, tests)
        elif project.framework == 'unittest':
            return self._run_unittest(project, tests)
        elif project.framework == 'robot':
            return self._run_robot(project, tests)
        elif project.framework == 'playwright':
            return self._run_playwright(project, tests)
        else:
            raise Exception(f"Unsupported framework: {project.framework}")

    def _run_pytest(self, project: AutomationProject, tests):
        """Запуск тестов с помощью pytest"""
        cmd = ['pytest', '-v']
        for test in tests:
            cmd.append(f"{project.local_path}/{test.file_path}::{test.name}")
        
        return self._run_command(cmd, project.local_path)

    def _run_unittest(self, project: AutomationProject, tests):
        """Запуск тестов с помощью unittest"""
        cmd = ['python', '-m', 'unittest']
        for test in tests:
            cmd.append(f"{test.file_path}")
        
        return self._run_command(cmd, project.local_path)

    def _run_robot(self, project: AutomationProject, tests):
        """Запуск тестов с помощью Robot Framework"""
        cmd = ['robot']
        for test in tests:
            cmd.extend(['--test', test.name])
        cmd.append(project.local_path)
        
        return self._run_command(cmd, project.local_path)

    def _run_playwright(self, project: AutomationProject, tests):
        """Запуск тестов с помощью Playwright"""
        cmd = ['npx', 'playwright', 'test']
        for test in tests:
            cmd.append(test.file_path)
        
        return self._run_command(cmd, project.local_path)

    def _run_command(self, cmd, cwd):
        """Выполнение команды"""
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True
            )
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def run_test(self, test: AutomationTest):
        """Запуск одного теста"""
        if not test.is_available:
            raise Exception("Test is not available")

        if not test.project.local_path or not os.path.exists(test.project.local_path):
            raise Exception("Repository not synced")

        if test.project.framework == 'pytest':
            cmd = ['pytest', '-v', f"{test.project.local_path}/{test.file_path}::{test.name}"]
        elif test.project.framework == 'unittest':
            cmd = ['python', '-m', 'unittest', f"{test.file_path}"]
        elif test.project.framework == 'robot':
            cmd = ['robot', '--test', test.name, test.project.local_path]
        elif test.project.framework == 'playwright':
            cmd = ['npx', 'playwright', 'test', test.file_path]
        else:
            raise Exception(f"Unsupported framework: {test.project.framework}")

        result = self._run_command(cmd, test.project.local_path)
        
        # Обновляем статус теста
        test.last_run = datetime.now()
        test.last_status = 'passed' if result['success'] else 'failed'
        test.save()

        return result
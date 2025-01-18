from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from ..models import TestCase
from ..services.test_runner import TestRunner

class ExecuteTestView(APIView):
    def post(self, request, test_case_id):
        """
        Запускает выполнение автоматизированного теста
        """
        test_case = get_object_or_404(TestCase, id=test_case_id)
        
        # Проверяем, что тест автоматизирован
        if test_case.test_type != 'automated':
            return Response(
                {'error': 'This test case is not automated'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем наличие скрипта
        if not hasattr(test_case, 'automationscript'):
            return Response(
                {'error': 'No automation script found for this test case'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Запускаем тест
        runner = TestRunner(test_case)
        results = runner.run()
        
        if results is None:
            return Response(
                {'error': 'Failed to prepare test environment'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(results)

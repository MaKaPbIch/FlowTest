import os
import base64
import io
import json
import tempfile
# Комментируем неустановленные библиотеки
# from weasyprint import HTML, CSS
# import pandas as pd
# import xlsxwriter
from django.template.loader import render_to_string
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse, FileResponse
from django.db.models import Q, Avg, Count, Sum, Case, When, F, Value
from django.conf import settings
from django.utils import timezone
from Backend.models.report_models import ReportTemplate, ReportData, Metric, ChartType, BackendCustomChart as CustomChart, Report
from FlowTestApp.models import TestRun, TestCase, AutomationProject, AutomationTest
from datetime import datetime, timedelta

class CustomChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomChart
        fields = ['id', 'name', 'description', 'chart_type', 'data_source', 'configuration', 'is_public']
        read_only_fields = ['id', 'created_at', 'updated_at']

class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = ['id', 'name', 'description', 'created_by', 'created_at', 'updated_at', 'project',
                 'is_public', 'metrics', 'charts', 'filters', 'layout', 'configuration']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['id', 'name', 'template', 'project', 'created_by', 'created_at',
                 'time_range', 'start_date', 'end_date', 'metrics_data', 'charts_data',
                 'pdf_file', 'excel_file']
        read_only_fields = ['id', 'created_at', 'created_by', 'pdf_file', 'excel_file']

class CustomChartViewSet(viewsets.ModelViewSet):
    serializer_class = CustomChartSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Возвращать только графики, созданные текущим пользователем или публичные
        queryset = CustomChart.objects.filter(
            Q(created_by=self.request.user) | Q(is_public=True)
        )
        
        # Фильтрация по проекту (если указан)
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
            
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def get_variables(self, request):
        """Получить список доступных переменных для графиков"""
        project_id = request.query_params.get('project')
        
        if not project_id:
            return Response(
                {'error': 'Project ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Определяем список доступных переменных
        variables = {
            'test_execution': [
                {'id': 'passed_count', 'name': 'Успешных тестов'},
                {'id': 'failed_count', 'name': 'Проваленных тестов'},
                {'id': 'skipped_count', 'name': 'Пропущенных тестов'},
                {'id': 'total_count', 'name': 'Всего тестов'},
                {'id': 'success_rate', 'name': 'Процент успешных тестов'},
                {'id': 'failure_rate', 'name': 'Процент проваленных тестов'}
            ],
            'test_duration': [
                {'id': 'avg_duration', 'name': 'Среднее время выполнения'},
                {'id': 'max_duration', 'name': 'Максимальное время выполнения'},
                {'id': 'min_duration', 'name': 'Минимальное время выполнения'},
                {'id': 'total_duration', 'name': 'Общее время выполнения'}
            ],
            'test_stability': [
                {'id': 'stability_score', 'name': 'Показатель стабильности'},
                {'id': 'flaky_tests', 'name': 'Нестабильные тесты'},
                {'id': 'stable_tests', 'name': 'Стабильные тесты'},
                {'id': 'failure_trend', 'name': 'Тренд проваленных тестов'}
            ]
        }
        
        return Response(variables)
    
    @action(detail=True, methods=['get'])
    def preview_data(self, request, pk=None):
        chart = self.get_object()
        project_id = request.query_params.get('project')
        
        if not project_id:
            return Response(
                {'error': 'Project ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем временной диапазон (по умолчанию последняя неделя)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=7)
        
        # Получаем данные для графика
        chart_data = self._get_chart_data(
            chart.data_source,
            chart.configuration,
            start_date,
            end_date,
            project_id
        )
        
        return Response(chart_data)
    
    def _get_chart_data(self, data_source, config, start_date, end_date, project_id):
        """Получает данные для графика в зависимости от источника данных"""
        if data_source == 'test_execution_by_day':
            return self._get_test_execution_by_day(start_date, end_date, project_id, config)
        elif data_source == 'status_distribution':
            return self._get_status_distribution(start_date, end_date, project_id, config)
        elif data_source == 'test_execution_time':
            return self._get_test_execution_time(start_date, end_date, project_id, config)
        elif data_source == 'test_stability':
            return self._get_test_stability(start_date, end_date, project_id, config)
        return {'error': 'Unknown data source'}
    
    def _get_test_execution_by_day(self, start_date, end_date, project_id, config):
        """График выполнения тестов по дням"""
        test_runs = TestRun.objects.filter(
            project_id=project_id,
            started_at__range=(start_date, end_date)
        ).order_by('started_at')
        
        # Группировка по дням
        days = []
        passed_counts = []
        failed_counts = []
        skipped_counts = []
        
        current_date = start_date.date()
        while current_date <= end_date.date():
            days.append(current_date.strftime('%Y-%m-%d'))
            
            day_runs = test_runs.filter(started_at__date=current_date)
            passed_counts.append(day_runs.filter(status='passed').count())
            failed_counts.append(day_runs.filter(status='failed').count())
            skipped_counts.append(day_runs.filter(status='skipped').count())
            
            current_date += timedelta(days=1)
        
        datasets = []
        if config.get('show_passed', True):
            datasets.append({
                'label': 'Успешно',
                'data': passed_counts,
                'borderColor': '#4CAF50',
                'backgroundColor': 'rgba(76, 175, 80, 0.1)'
            })
        
        if config.get('show_failed', True):
            datasets.append({
                'label': 'Ошибка',
                'data': failed_counts,
                'borderColor': '#F44336',
                'backgroundColor': 'rgba(244, 67, 54, 0.1)'
            })
        
        if config.get('show_skipped', True):
            datasets.append({
                'label': 'Пропущено',
                'data': skipped_counts,
                'borderColor': '#FFC107',
                'backgroundColor': 'rgba(255, 193, 7, 0.1)'
            })
        
        return {
            'labels': days,
            'datasets': datasets
        }
    
    def _get_status_distribution(self, start_date, end_date, project_id, config):
        """Распределение статусов тестов"""
        test_runs = TestRun.objects.filter(
            project_id=project_id,
            started_at__range=(start_date, end_date)
        )
        
        passed = test_runs.filter(status='passed').count()
        failed = test_runs.filter(status='failed').count()
        skipped = test_runs.filter(status='skipped').count()
        
        return {
            'labels': ['Успешно', 'Ошибка', 'Пропущено'],
            'datasets': [{
                'data': [passed, failed, skipped],
                'backgroundColor': [
                    '#4CAF50',  # Green
                    '#F44336',  # Red
                    '#FFC107'   # Yellow
                ]
            }]
        }
    
    def _get_test_execution_time(self, start_date, end_date, project_id, config):
        """Время выполнения тестов"""
        test_runs = TestRun.objects.filter(
            project_id=project_id,
            started_at__range=(start_date, end_date),
            duration__isnull=False
        )
        
        test_cases = TestCase.objects.filter(
            id__in=test_runs.values_list('test_case', flat=True)
        )
        
        labels = []
        data = []
        
        # Ограничиваем количество тестов для отображения
        limit = config.get('limit', 10)
        
        # Собираем среднее время выполнения для каждого теста
        test_data = []
        for test_case in test_cases[:limit]:
            avg_duration = test_runs.filter(test_case=test_case).aggregate(avg=Avg('duration'))['avg']
            if avg_duration:
                test_data.append({
                    'name': test_case.name,
                    'duration': avg_duration
                })
        
        # Сортируем по длительности
        test_data.sort(key=lambda x: x['duration'], reverse=True)
        
        # Ограничиваем количество тестов для отображения
        for test in test_data[:limit]:
            labels.append(test['name'])
            data.append(test['duration'])
        
        return {
            'labels': labels,
            'datasets': [{
                'label': 'Время выполнения (сек)',
                'data': data,
                'backgroundColor': 'rgba(54, 162, 235, 0.5)',
                'borderColor': 'rgba(54, 162, 235, 1)',
                'borderWidth': 1
            }]
        }
    
    def _get_test_stability(self, start_date, end_date, project_id, config):
        """Стабильность тестов (процент успешных запусков)"""
        test_runs = TestRun.objects.filter(
            project_id=project_id,
            started_at__range=(start_date, end_date)
        )
        
        test_cases = TestCase.objects.filter(
            id__in=test_runs.values_list('test_case', flat=True)
        )
        
        labels = []
        data = []
        
        # Ограничиваем количество тестов для отображения
        limit = config.get('limit', 10)
        min_runs = config.get('min_runs', 5)
        
        # Собираем стабильность для каждого теста
        test_data = []
        for test_case in test_cases:
            test_runs_count = test_runs.filter(test_case=test_case).count()
            if test_runs_count >= min_runs:
                passed_count = test_runs.filter(test_case=test_case, status='passed').count()
                stability = (passed_count / test_runs_count) * 100
                test_data.append({
                    'name': test_case.name,
                    'stability': stability,
                    'runs': test_runs_count
                })
        
        # Сортируем по стабильности (от наименее стабильных к наиболее)
        test_data.sort(key=lambda x: x['stability'])
        
        # Ограничиваем количество тестов для отображения
        for test in test_data[:limit]:
            labels.append(f"{test['name']} ({test['runs']} runs)")
            data.append(test['stability'])
        
        return {
            'labels': labels,
            'datasets': [{
                'label': 'Стабильность (%)',
                'data': data,
                'backgroundColor': [
                    # Цвета от красного к зеленому в зависимости от стабильности
                    f'rgba({int(255 - (stability * 2.55))}, {int(stability * 2.55)}, 0, 0.7)'
                    for stability in data
                ]
            }]
        }

class ReportTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ReportTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ReportTemplate.objects.filter(
            Q(created_by=self.request.user) | Q(is_public=True)
        )
        
        # Фильтрация по проекту (обязательный параметр)
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        else:
            # Если проект не указан, возвращаем пустой список
            queryset = ReportTemplate.objects.none()
            
        return queryset
    
    def perform_create(self, serializer):
        project_id = self.request.data.get('project')
        serializer.save(created_by=self.request.user, project_id=project_id)
        
    @action(detail=False, methods=['get'], url_path='analytics/metrics')
    def get_metrics_data(self, request):
        """Get metrics data for report templates"""
        project_id = request.query_params.get('project')
        time_range = request.query_params.get('time_range', 'lastWeek')
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        
        if not project_id:
            return Response(
                {'error': 'Project ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get date range based on time_range or custom dates
        end_date = timezone.now()
        if time_range == 'custom' and start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d')
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d')
                end_date = end_date.replace(hour=23, minute=59, second=59)
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Standard date ranges
            if time_range == 'last24Hours':
                start_date = end_date - timedelta(days=1)
            elif time_range == 'lastWeek':
                start_date = end_date - timedelta(weeks=1)
            elif time_range == 'lastMonth':
                start_date = end_date - timedelta(days=30)
            elif time_range == 'lastYear':
                start_date = end_date - timedelta(days=365)
            else:
                start_date = end_date - timedelta(weeks=1)  # Default to last week
        
        # Get all test runs for this project (we'll filter by date later if needed)
        all_test_runs = TestRun.objects.filter(
            test_case__project_id=project_id
        )
            
        # Get metrics data
        metrics_data = {}
        
        # Filter by date range for time-sensitive metrics
        filtered_test_runs = all_test_runs.filter(started_at__range=(start_date, end_date))
        
        # totalTests - count unique test cases, not test runs
        total_tests = filtered_test_runs.values('test_case').distinct().count()
        metrics_data['totalTests'] = {
            'value': total_tests,
            'trend': 0  # Mock trend for now
        }
        
        # successRate
        passed_tests = filtered_test_runs.filter(status='passed').count()
        
        if total_tests > 0:
            success_rate = round((passed_tests / total_tests) * 100)
        else:
            success_rate = 0
            
        metrics_data['successRate'] = {
            'value': f"{success_rate}%",
            'trend': 0  # Mock trend for now
        }
        
        # failedTests
        failed_tests = filtered_test_runs.filter(status='failed').count()
        metrics_data['failedTests'] = {
            'value': failed_tests,
            'trend': 0  # Mock trend for now
        }
        
        # averageTime
        avg_duration = filtered_test_runs.filter(
            execution_time__isnull=False
        ).aggregate(avg=Avg('execution_time'))['avg']
        
        if avg_duration:
            avg_duration_formatted = f"{int(avg_duration)}s"
        else:
            avg_duration_formatted = "0s"
            
        metrics_data['averageTime'] = {
            'value': avg_duration_formatted,
            'trend': 0  # Mock trend for now
        }
        
        # Add more metrics as needed
        skipped_tests = filtered_test_runs.filter(status='skipped').count()
        metrics_data['skippedTests'] = {
            'value': skipped_tests,
            'trend': 0
        }
        
        # Test stability (percentage of tests that pass consistently)
        # This needs more sophisticated calculation in a real implementation
        metrics_data['testStability'] = {
            'value': f"{success_rate}%",  # Simplified - use success rate as proxy
            'trend': 0
        }
        
        # Automation rate (percentage of automated tests)
        # This is a placeholder - would need actual data about manual vs automated tests
        metrics_data['automationRate'] = {
            'value': '100%',  # Assuming all tests in system are automated
            'trend': 0
        }
        
        # Flakiness (tests that sometimes pass, sometimes fail)
        # This is a simplified placeholder
        metrics_data['flakiness'] = {
            'value': '0%',  # Placeholder
            'trend': 0
        }
        
        # Blocked tests
        metrics_data['blockedTests'] = {
            'value': 0,  # Placeholder - would need actual data
            'trend': 0
        }
        
        return Response(metrics_data)
        
    @action(detail=False, methods=['get'], url_path='analytics/charts/(?P<chart_type>[^/.]+)')
    def get_chart_data(self, request, chart_type):
        """Get chart data for report templates"""
        project_id = request.query_params.get('project')
        time_range = request.query_params.get('time_range', 'lastWeek')
        
        if not project_id:
            return Response(
                {'error': 'Project ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get date range based on time_range
        end_date = timezone.now()
        if time_range == 'last24Hours':
            start_date = end_date - timedelta(days=1)
        elif time_range == 'lastWeek':
            start_date = end_date - timedelta(weeks=1)
        elif time_range == 'lastMonth':
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)  # Default to last week
            
        # Get chart data based on chart type
        if chart_type == 'executionTrend':
            return Response(self._get_execution_trends_data(start_date, end_date, project_id))
        elif chart_type == 'statusDistribution':
            return Response(self._get_status_distribution_data(start_date, end_date, project_id))
        elif chart_type == 'testExecutionTime':
            return Response(self._get_test_execution_time_data(start_date, end_date, project_id))
        elif chart_type == 'testStability':
            return Response(self._get_test_stability_data(start_date, end_date, project_id))
        else:
            return Response(
                {'error': f'Unknown chart type: {chart_type}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def generate_report(self, request, pk=None):
        template = self.get_object()
        project_id = request.data.get('project')
        report_name = request.data.get('name', '')
        time_range = request.data.get('time_range', 'last24Hours')
        
        # Проверяем доступ к проекту
        if not self.request.user.has_project_access(project_id):
            return Response(
                {'error': 'You do not have access to this project'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Получаем временной диапазон
        end_date = timezone.now()
        if time_range == 'last24Hours':
            start_date = end_date - timedelta(days=1)
        elif time_range == 'lastWeek':
            start_date = end_date - timedelta(weeks=1)
        elif time_range == 'lastMonth':
            start_date = end_date - timedelta(days=30)
        elif time_range == 'last3Months':
            start_date = end_date - timedelta(days=90)
        elif time_range == 'last6Months':
            start_date = end_date - timedelta(days=180) 
        elif time_range == 'lastYear':
            start_date = end_date - timedelta(days=365)
        elif time_range == 'custom' and request.data.get('start_date') and request.data.get('end_date'):
            start_date = datetime.strptime(request.data.get('start_date'), '%Y-%m-%d')
            end_date = datetime.strptime(request.data.get('end_date'), '%Y-%m-%d')
            end_date = end_date.replace(hour=23, minute=59, second=59)
        else:
            return Response(
                {'error': 'Invalid time range or missing custom dates'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Собираем данные для метрик
        metrics_data = {}
        if template.configuration and 'metrics' in template.configuration:
            for metric_name in template.configuration.get('metrics', []):
                metrics_data[metric_name] = self._calculate_metric(
                    metric_name,
                    start_date,
                    end_date,
                    project_id
                )

        # Собираем данные для графиков
        charts_data = {}
        if template.configuration and 'charts' in template.configuration:
            for chart in template.configuration.get('charts', []):
                chart_id = chart.get('id')
                if chart_id:
                    charts_data[chart_id] = self._get_chart_data(
                        chart,
                        start_date,
                        end_date,
                        project_id
                    )

        # Создаем отчет
        report = Report.objects.create(
            template=template,
            project_id=project_id,
            name=report_name or f"{template.name} - {timezone.now().strftime('%Y-%m-%d')}",
            created_by=request.user,
            time_range=time_range,
            start_date=start_date,
            end_date=end_date,
            metrics_data=metrics_data,
            charts_data=charts_data
        )
        
        # Генерируем PDF и Excel файлы
        self._generate_report_files(report)

        return Response(ReportSerializer(report).data)
    
    @action(detail=True, methods=['get'], url_path='analytics/preview')
    def preview(self, request, pk=None):
        """Предварительный просмотр отчета без сохранения"""
        template = self.get_object()
        project_id = request.query_params.get('project')
        time_range = request.query_params.get('time_range', 'last24Hours')
        
        if not project_id:
            return Response(
                {'error': 'Project ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем временной диапазон
        end_date = timezone.now()
        if time_range == 'last24Hours':
            start_date = end_date - timedelta(days=1)
        elif time_range == 'lastWeek':
            start_date = end_date - timedelta(weeks=1)
        elif time_range == 'lastMonth':
            start_date = end_date - timedelta(days=30)
        elif time_range == 'custom':
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            if not start_date_str or not end_date_str:
                return Response(
                    {'error': 'Custom time range requires start_date and end_date parameters'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            end_date = end_date.replace(hour=23, minute=59, second=59)
        else:
            return Response(
                {'error': 'Invalid time range'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем данные для предпросмотра
        preview_data = self._get_preview_data(template, start_date, end_date, project_id)
        
        return Response(preview_data)
    
    def _get_preview_data(self, template, start_date, end_date, project_id):
        """Получает данные для предпросмотра отчета"""
        # Собираем данные для метрик
        metrics_data = {}
        if template.configuration and 'metrics' in template.configuration:
            for metric_name in template.configuration.get('metrics', []):
                metrics_data[metric_name] = self._calculate_metric(
                    metric_name,
                    start_date,
                    end_date,
                    project_id
                )

        # Собираем данные для графиков
        charts_data = {}
        if template.configuration and 'charts' in template.configuration:
            for chart in template.configuration.get('charts', []):
                chart_id = chart.get('id')
                if chart_id:
                    charts_data[chart_id] = self._get_chart_data(
                        chart,
                        start_date,
                        end_date,
                        project_id
                    )
        
        # Получаем информацию о проекте
        try:
            project = AutomationProject.objects.get(id=project_id)
            project_name = project.name
        except AutomationProject.DoesNotExist:
            project_name = f"Project #{project_id}"
        
        return {
            'template': {
                'id': template.id,
                'name': template.name,
                'configuration': template.configuration
            },
            'dateRange': {
                'start': start_date,
                'end': end_date
            },
            'project': {
                'id': project_id,
                'name': project_name
            },
            'metrics': metrics_data,
            'charts': charts_data
        }
    
    def _generate_report_files(self, report):
        """Генерирует PDF и Excel файлы для отчета"""
        # Получаем предварительные данные для отчета
        preview_data = self._get_preview_data(
            report.template, 
            report.start_date, 
            report.end_date, 
            report.project_id
        )
        
        # Генерируем PDF
        pdf_file_path = self._generate_pdf(report, preview_data)
        if pdf_file_path:
            with open(pdf_file_path, 'rb') as pdf_file:
                report.pdf_file.save(
                    f"report_{report.id}.pdf",
                    io.BytesIO(pdf_file.read())
                )
            # Удаляем временный файл
            os.remove(pdf_file_path)
        
        # Генерируем Excel
        excel_file_path = self._generate_excel(report, preview_data)
        if excel_file_path:
            with open(excel_file_path, 'rb') as excel_file:
                report.excel_file.save(
                    f"report_{report.id}.xlsx",
                    io.BytesIO(excel_file.read())
                )
            # Удаляем временный файл
            os.remove(excel_file_path)
        
        # Сохраняем отчет
        report.save()
    
    def _generate_pdf(self, report, preview_data):
        """Генерирует PDF файл для отчета"""
        try:
            # Подготавливаем данные для шаблона
            context = {
                'report': report,
                'preview': preview_data,
                'generated_at': timezone.now(),
                'charts_as_images': {}
            }
            
            # Рендерим HTML для каждого графика (в реальном проекте нужно использовать библиотеку для рендеринга графиков)
            # for chart_id, chart_data in preview_data['charts'].items():
            #     chart_image = self._render_chart_to_image(chart_data)
            #     if chart_image:
            #         context['charts_as_images'][chart_id] = f"data:image/png;base64,{chart_image}"
            
            # Рендерим HTML шаблон
            html_string = render_to_string('report_template.html', context)
            
            # Закомментируем создание PDF из-за отсутствия библиотеки weasyprint
            # with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            #    HTML(string=html_string).write_pdf(tmp_file.name)
            
            # Возвращаем заглушку
            return None
        except Exception as e:
            print(f"Error generating PDF: {e}")
            return None
    
    def _generate_excel(self, report, preview_data):
        """Генерирует Excel файл для отчета"""
        try:
            # Закомментируем создание Excel из-за отсутствия библиотеки xlsxwriter
            
            # # Создаем временный файл Excel
            # with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
            #     # Создаем Excel файл
            #     workbook = xlsxwriter.Workbook(tmp_file.name)
            #     
            #     # Создаем форматы
            #     header_format = workbook.add_format({
            #         'bold': True,
            #         'bg_color': '#4B7BEC',
            #         'color': 'white',
            #         'border': 1
            #     })
            #     
            #     cell_format = workbook.add_format({
            #         'border': 1
            #     })
            #     
            #     # Лист с основной информацией
            #     summary_sheet = workbook.add_worksheet('Summary')
            #     
            #     # Заголовок
            #     summary_sheet.write(0, 0, 'Report Name', header_format)
            #     summary_sheet.write(0, 1, report.name, cell_format)
            #     
            #     summary_sheet.write(1, 0, 'Template', header_format)
            #     summary_sheet.write(1, 1, report.template.name, cell_format)
            #     
            #     summary_sheet.write(2, 0, 'Project', header_format)
            #     summary_sheet.write(2, 1, preview_data['project']['name'], cell_format)
            #     
            #     summary_sheet.write(3, 0, 'Date Range', header_format)
            #     summary_sheet.write(3, 1, f"{report.start_date.strftime('%Y-%m-%d')} to {report.end_date.strftime('%Y-%m-%d')}", cell_format)
            #     
            #     summary_sheet.write(4, 0, 'Generated At', header_format)
            #     summary_sheet.write(4, 1, timezone.now().strftime('%Y-%m-%d %H:%M:%S'), cell_format)
            #     
            #     # Метрики
            #     summary_sheet.write(6, 0, 'Metrics', header_format)
            #     row = 7
            #     for metric_name, metric_data in preview_data['metrics'].items():
            #         summary_sheet.write(row, 0, metric_name, header_format)
            #         summary_sheet.write(row, 1, str(metric_data.get('value', 'N/A')), cell_format)
            #         row += 1
            #     
            #     # Добавляем лист с данными тестов
            #     test_data_sheet = workbook.add_worksheet('Test Data')
            #     
            #     # Получаем данные о запусках тестов
            #     test_runs = TestRun.objects.filter(
            #         project_id=report.project_id,
            #         started_at__range=(report.start_date, report.end_date)
            #     ).select_related('test_case').order_by('-started_at')
            #     
            #     # Заголовки
            #     headers = ['Test Name', 'Status', 'Started At', 'Duration (s)', 'Author']
            #     for col, header in enumerate(headers):
            #         test_data_sheet.write(0, col, header, header_format)
            #     
            #     # Данные
            #     for row, test_run in enumerate(test_runs, start=1):
            #         test_data_sheet.write(row, 0, test_run.test_case.name if test_run.test_case else 'Unknown', cell_format)
            #         test_data_sheet.write(row, 1, test_run.status, cell_format)
            #         test_data_sheet.write(row, 2, test_run.started_at.strftime('%Y-%m-%d %H:%M:%S'), cell_format)
            #         test_data_sheet.write(row, 3, test_run.duration or 0, cell_format)
            #         test_data_sheet.write(row, 4, test_run.test_case.author.username if test_run.test_case and test_run.test_case.author else 'Unknown', cell_format)
            #     
            #     # Автоматическая настройка ширины колонок
            #     summary_sheet.set_column(0, 0, 20)
            #     summary_sheet.set_column(1, 1, 40)
            #     test_data_sheet.set_column(0, 0, 40)
            #     test_data_sheet.set_column(1, 4, 15)
            #     
            #     workbook.close()
                
            # return tmp_file.name
            
            # Вместо этого возвращаем None - заглушку
            return None
        except Exception as e:
            print(f"Error generating Excel: {e}")
            return None
    
    def _calculate_metric(self, metric_name, start_date, end_date, project_id):
        """Вычисляет значение метрики за указанный период"""
        try:
            if metric_name == 'successfulTests':
                return {
                    'value': self._get_successful_tests_count(start_date, end_date, project_id),
                    'trend': self._calculate_trend('successfulTests', start_date, end_date, project_id)
                }
            elif metric_name == 'successRate':
                total = self._get_total_tests_count(start_date, end_date, project_id)
                successful = self._get_successful_tests_count(start_date, end_date, project_id)
                return {
                    'value': int((successful / total * 100) if total > 0 else 0),
                    'trend': self._calculate_trend('successRate', start_date, end_date, project_id)
                }
            elif metric_name == 'averageTime':
                return {
                    'value': self._get_average_execution_time(start_date, end_date, project_id),
                    'trend': self._calculate_trend('averageTime', start_date, end_date, project_id)
                }
            elif metric_name == 'totalTests':
                return {
                    'value': self._get_total_tests_count(start_date, end_date, project_id),
                    'trend': self._calculate_trend('totalTests', start_date, end_date, project_id)
                }
            elif metric_name == 'failedTests':
                return {
                    'value': self._get_failed_tests_count(start_date, end_date, project_id),
                    'trend': self._calculate_trend('failedTests', start_date, end_date, project_id)
                }
            elif metric_name == 'skippedTests':
                return {
                    'value': self._get_skipped_tests_count(start_date, end_date, project_id),
                    'trend': self._calculate_trend('skippedTests', start_date, end_date, project_id)
                }
        except Exception as e:
            print(f"Error calculating metric {metric_name}: {e}")
            return {'value': 'N/A', 'trend': 0}
        
        return {'value': 'N/A', 'trend': 0}

    def _get_chart_data(self, chart_config, start_date, end_date, project_id):
        """Получает данные для графика за указанный период"""
        chart_type = chart_config.get('type')
        
        try:
            if chart_type == 'executionTrend':
                return self._get_execution_trends_data(start_date, end_date, project_id)
            elif chart_type == 'statusDistribution':
                return self._get_status_distribution_data(start_date, end_date, project_id)
            elif chart_type == 'testExecutionTime':
                return self._get_test_execution_time_data(start_date, end_date, project_id)
            elif chart_type == 'testStability':
                return self._get_test_stability_data(start_date, end_date, project_id)
            elif chart_type == 'custom':
                custom_chart_id = chart_config.get('customChartId')
                if custom_chart_id:
                    try:
                        custom_chart = CustomChart.objects.get(id=custom_chart_id)
                        chart_handler = CustomChartViewSet()
                        return chart_handler._get_chart_data(
                            custom_chart.data_source,
                            custom_chart.configuration,
                            start_date,
                            end_date,
                            project_id
                        )
                    except CustomChart.DoesNotExist:
                        return {'error': 'Custom chart not found'}
        except Exception as e:
            print(f"Error getting chart data for {chart_type}: {e}")
            return {'error': f'Error generating chart data: {str(e)}'}
            
        return {'error': 'Unknown chart type'}

    def _get_successful_tests_count(self, start_date, end_date, project_id):
        """Получает количество успешных тестов"""
        return TestRun.objects.filter(
            project_id=project_id,
            status='passed',
            started_at__range=(start_date, end_date)
        ).count()
    
    def _get_failed_tests_count(self, start_date, end_date, project_id):
        """Получает количество неуспешных тестов"""
        return TestRun.objects.filter(
            project_id=project_id,
            status='failed',
            started_at__range=(start_date, end_date)
        ).count()
    
    def _get_skipped_tests_count(self, start_date, end_date, project_id):
        """Получает количество пропущенных тестов"""
        return TestRun.objects.filter(
            project_id=project_id,
            status='skipped',
            started_at__range=(start_date, end_date)
        ).count()

    def _get_average_execution_time(self, start_date, end_date, project_id):
        """Получает среднее время выполнения тестов"""
        avg_duration = TestRun.objects.filter(
            project_id=project_id,
            started_at__range=(start_date, end_date),
            duration__isnull=False
        ).aggregate(avg=Avg('duration'))['avg']
        
        if not avg_duration:
            return "0s"
            
        # Форматируем длительность
        hours = int(avg_duration // 3600)
        minutes = int((avg_duration % 3600) // 60)
        seconds = int(avg_duration % 60)
        
        if hours > 0:
            return f"{hours}h {minutes}m"
        if minutes > 0:
            return f"{minutes}m {seconds}s"
        return f"{seconds}s"

    def _get_total_tests_count(self, start_date, end_date, project_id):
        """Получает общее количество тестов"""
        return TestRun.objects.filter(
            project_id=project_id,
            started_at__range=(start_date, end_date)
        ).count()

    def _calculate_trend(self, metric_name, start_date, end_date, project_id):
        """Вычисляет тренд изменения метрики"""
        # Получаем данные за предыдущий период такой же длительности
        period_length = end_date - start_date
        prev_end_date = start_date
        prev_start_date = prev_end_date - period_length
        
        # Получаем значения метрик для обоих периодов
        if metric_name == 'successfulTests':
            current_value = self._get_successful_tests_count(start_date, end_date, project_id)
            prev_value = self._get_successful_tests_count(prev_start_date, prev_end_date, project_id)
        elif metric_name == 'totalTests':
            current_value = self._get_total_tests_count(start_date, end_date, project_id)
            prev_value = self._get_total_tests_count(prev_start_date, prev_end_date, project_id)
        elif metric_name == 'failedTests':
            current_value = self._get_failed_tests_count(start_date, end_date, project_id)
            prev_value = self._get_failed_tests_count(prev_start_date, prev_end_date, project_id)
        elif metric_name == 'skippedTests':
            current_value = self._get_skipped_tests_count(start_date, end_date, project_id)
            prev_value = self._get_skipped_tests_count(prev_start_date, prev_end_date, project_id)
        elif metric_name == 'successRate':
            total_current = self._get_total_tests_count(start_date, end_date, project_id)
            successful_current = self._get_successful_tests_count(start_date, end_date, project_id)
            current_value = (successful_current / total_current * 100) if total_current > 0 else 0
            
            total_prev = self._get_total_tests_count(prev_start_date, prev_end_date, project_id)
            successful_prev = self._get_successful_tests_count(prev_start_date, prev_end_date, project_id)
            prev_value = (successful_prev / total_prev * 100) if total_prev > 0 else 0
        else:
            return 0
            
        # Вычисляем процент изменения
        if prev_value == 0:
            return 100 if current_value > 0 else 0
            
        return ((current_value - prev_value) / prev_value) * 100

    def _get_execution_trends_data(self, start_date, end_date, project_id):
        """Получает данные для графика трендов выполнения"""
        # Получаем все результаты тестов за период
        test_runs = TestRun.objects.filter(
            project_id=project_id,
            started_at__range=(start_date, end_date)
        ).order_by('started_at')
        
        # Определяем интервал группировки в зависимости от длительности периода
        period_days = (end_date.date() - start_date.date()).days
        if period_days <= 7:
            # Группировка по дням для короткого периода
            group_by = 'day'
            date_format = '%Y-%m-%d'
        elif period_days <= 31:
            # Группировка по дням для месяца
            group_by = 'day'
            date_format = '%Y-%m-%d'
        elif period_days <= 90:
            # Группировка по неделям для квартала
            group_by = 'week'
            date_format = '%Y-%U'  # Год-неделя
        else:
            # Группировка по месяцам для более длительных периодов
            group_by = 'month'
            date_format = '%Y-%m'
        
        # Группируем результаты
        labels = []
        successful = []
        failed = []
        skipped = []
        
        if group_by == 'day':
            current_date = start_date.date()
            while current_date <= end_date.date():
                labels.append(current_date.strftime(date_format))
                
                day_runs = test_runs.filter(started_at__date=current_date)
                successful.append(day_runs.filter(status='passed').count())
                failed.append(day_runs.filter(status='failed').count())
                skipped.append(day_runs.filter(status='skipped').count())
                
                current_date += timedelta(days=1)
        elif group_by == 'week':
            # Группировка по неделям
            weeks = {}
            current_date = start_date
            while current_date <= end_date:
                week_key = current_date.strftime(date_format)
                if week_key not in weeks:
                    weeks[week_key] = {
                        'label': f"Week {current_date.strftime('%U')}",
                        'passed': 0,
                        'failed': 0,
                        'skipped': 0
                    }
                
                current_date += timedelta(days=1)
            
            for run in test_runs:
                week_key = run.started_at.strftime(date_format)
                if week_key in weeks:
                    if run.status == 'passed':
                        weeks[week_key]['passed'] += 1
                    elif run.status == 'failed':
                        weeks[week_key]['failed'] += 1
                    elif run.status == 'skipped':
                        weeks[week_key]['skipped'] += 1
            
            # Сортируем недели и заполняем данные
            for week_key in sorted(weeks.keys()):
                labels.append(weeks[week_key]['label'])
                successful.append(weeks[week_key]['passed'])
                failed.append(weeks[week_key]['failed'])
                skipped.append(weeks[week_key]['skipped'])
        elif group_by == 'month':
            # Группировка по месяцам
            months = {}
            current_date = start_date
            while current_date <= end_date:
                month_key = current_date.strftime(date_format)
                if month_key not in months:
                    months[month_key] = {
                        'label': current_date.strftime('%b %Y'),
                        'passed': 0,
                        'failed': 0,
                        'skipped': 0
                    }
                
                # Переходим к следующему дню
                current_date += timedelta(days=1)
            
            for run in test_runs:
                month_key = run.started_at.strftime(date_format)
                if month_key in months:
                    if run.status == 'passed':
                        months[month_key]['passed'] += 1
                    elif run.status == 'failed':
                        months[month_key]['failed'] += 1
                    elif run.status == 'skipped':
                        months[month_key]['skipped'] += 1
            
            # Сортируем месяцы и заполняем данные
            for month_key in sorted(months.keys()):
                labels.append(months[month_key]['label'])
                successful.append(months[month_key]['passed'])
                failed.append(months[month_key]['failed'])
                skipped.append(months[month_key]['skipped'])

        return {
            'labels': labels,
            'datasets': [
                {
                    'label': 'Успешные',
                    'data': successful,
                    'borderColor': '#4CAF50',
                    'backgroundColor': 'rgba(76, 175, 80, 0.1)'
                },
                {
                    'label': 'Неуспешные',
                    'data': failed,
                    'borderColor': '#F44336',
                    'backgroundColor': 'rgba(244, 67, 54, 0.1)'
                },
                {
                    'label': 'Пропущенные',
                    'data': skipped,
                    'borderColor': '#FFC107',
                    'backgroundColor': 'rgba(255, 193, 7, 0.1)'
                }
            ]
        }

    def _get_status_distribution_data(self, start_date, end_date, project_id):
        """Получает данные для графика распределения статусов"""
        test_runs = TestRun.objects.filter(
            project_id=project_id,
            started_at__range=(start_date, end_date)
        )
        
        passed = test_runs.filter(status='passed').count()
        failed = test_runs.filter(status='failed').count()
        skipped = test_runs.filter(status='skipped').count()

        return {
            'labels': ['Успешно', 'Неуспешно', 'Пропущено'],
            'datasets': [{
                'data': [passed, failed, skipped],
                'backgroundColor': [
                    '#4CAF50',  # Green
                    '#F44336',  # Red
                    '#FFC107'   # Yellow
                ]
            }]
        }
    
    def _get_test_execution_time_data(self, start_date, end_date, project_id):
        """Получает данные для графика времени выполнения тестов"""
        # Выбираем топ-10 тестов с самой большой средней длительностью
        test_runs = TestRun.objects.filter(
            project_id=project_id,
            started_at__range=(start_date, end_date),
            duration__isnull=False
        ).values('test_case').annotate(
            avg_duration=Avg('duration')
        ).order_by('-avg_duration')[:10]
        
        labels = []
        data = []
        
        for run in test_runs:
            if run['test_case']:
                try:
                    test_case = TestCase.objects.get(id=run['test_case'])
                    labels.append(test_case.name)
                    data.append(run['avg_duration'])
                except TestCase.DoesNotExist:
                    continue
        
        return {
            'labels': labels,
            'datasets': [{
                'label': 'Среднее время выполнения (сек)',
                'data': data,
                'backgroundColor': 'rgba(54, 162, 235, 0.5)',
                'borderColor': 'rgba(54, 162, 235, 1)',
                'borderWidth': 1
            }]
        }
    
    def _get_test_stability_data(self, start_date, end_date, project_id):
        """Получает данные для графика стабильности тестов"""
        # Выбираем тесты с количеством запусков не менее 5 и вычисляем их стабильность
        min_runs = 5
        
        # Находим тесты с достаточным количеством запусков
        test_cases_with_runs = TestRun.objects.filter(
            project_id=project_id,
            started_at__range=(start_date, end_date)
        ).values('test_case').annotate(
            total_runs=Count('id')
        ).filter(total_runs__gte=min_runs)
        
        # Собираем данные о стабильности для каждого теста
        stability_data = []
        for tc in test_cases_with_runs:
            if not tc['test_case']:
                continue
                
            test_case_id = tc['test_case']
            total_runs = tc['total_runs']
            
            # Считаем успешные запуски
            passed_runs = TestRun.objects.filter(
                project_id=project_id,
                test_case_id=test_case_id,
                status='passed',
                started_at__range=(start_date, end_date)
            ).count()
            
            # Вычисляем стабильность как процент успешных запусков
            stability = (passed_runs / total_runs) * 100
            
            try:
                test_case = TestCase.objects.get(id=test_case_id)
                stability_data.append({
                    'name': test_case.name,
                    'stability': stability,
                    'runs': total_runs
                })
            except TestCase.DoesNotExist:
                continue
        
        # Сортируем по стабильности (от наименее стабильных к наиболее)
        stability_data.sort(key=lambda x: x['stability'])
        
        # Ограничиваем список 10 тестами
        stability_data = stability_data[:10]
        
        labels = [f"{item['name']} ({item['runs']} runs)" for item in stability_data]
        data = [item['stability'] for item in stability_data]
        
        # Создаем цвета в зависимости от стабильности (от красного к зеленому)
        colors = []
        for stability in data:
            red = int(255 * (1 - stability / 100))
            green = int(255 * (stability / 100))
            colors.append(f'rgba({red}, {green}, 0, 0.7)')
        
        return {
            'labels': labels,
            'datasets': [{
                'label': 'Стабильность (%)',
                'data': data,
                'backgroundColor': colors
            }]
        }

class MetricViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Metric.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

class ChartTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ChartType.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Report.objects.filter(
            created_by=self.request.user
        )
        
        # Фильтрация по проекту
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
            
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Скачать отчет в формате PDF"""
        report = self.get_object()
        
        if not report.pdf_file:
            return Response(
                {'error': 'PDF file not available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        return FileResponse(
            report.pdf_file.open('rb'),
            as_attachment=True,
            filename=f"report_{report.id}.pdf"
        )
    
    @action(detail=True, methods=['get'])
    def download_excel(self, request, pk=None):
        """Скачать отчет в формате Excel"""
        report = self.get_object()
        
        if not report.excel_file:
            return Response(
                {'error': 'Excel file not available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        return FileResponse(
            report.excel_file.open('rb'),
            as_attachment=True,
            filename=f"report_{report.id}.xlsx"
        )

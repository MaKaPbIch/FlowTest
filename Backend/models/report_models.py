from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

class ReportTemplate(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    project = models.ForeignKey('FlowTestApp.Project', on_delete=models.CASCADE, related_name='report_templates', null=True)
    is_public = models.BooleanField(default=False, help_text="Whether this template is public for all users")
    
    # Конфигурация шаблона
    metrics = models.JSONField(default=list, help_text="List of metrics to display")
    charts = models.JSONField(default=list, help_text="List of charts configurations")
    filters = models.JSONField(default=dict, help_text="Filter configurations")
    layout = models.JSONField(default=dict, help_text="Layout configuration")
    configuration = models.JSONField(default=dict, help_text="Full template configuration including all settings")
    
    class Meta:
        ordering = ['-created_at']
        unique_together = [['name', 'project']]

    def __str__(self):
        return self.name

class Report(models.Model):
    """Completed report based on a template"""
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE, related_name='reports')
    project = models.ForeignKey('FlowTestApp.Project', on_delete=models.CASCADE, related_name='reports')
    name = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    time_range = models.CharField(max_length=50, default='last24Hours',
                                help_text="Time range for the report (e.g., 'last24Hours', 'lastWeek')")
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    
    # Report data
    metrics_data = models.JSONField(default=dict)
    charts_data = models.JSONField(default=dict)
    
    # Generated files
    pdf_file = models.FileField(upload_to='reports/pdf/', null=True, blank=True)
    excel_file = models.FileField(upload_to='reports/excel/', null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        if self.name:
            return self.name
        return f"Report from {self.template.name} - {self.created_at}"

class ReportData(models.Model):
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE)
    project = models.ForeignKey('FlowTestApp.Project', on_delete=models.CASCADE, related_name='report_data')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Данные отчета
    metrics_data = models.JSONField(default=dict)
    charts_data = models.JSONField(default=dict)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Data for {self.template.name} at {self.created_at}"

class Metric(models.Model):
    """Модель для определения доступных метрик"""
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    data_type = models.CharField(max_length=50, choices=[
        ('number', 'Number'),
        ('percentage', 'Percentage'),
        ('duration', 'Duration'),
        ('string', 'String')
    ])
    calculation_method = models.CharField(max_length=100, help_text="Method to calculate this metric")
    icon = models.CharField(max_length=50, blank=True)
    
    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.display_name

class ChartType(models.Model):
    """Модель для определения типов графиков"""
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    config_schema = models.JSONField(help_text="JSON Schema for chart configuration")
    
    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.display_name

class BackendCustomChart(models.Model):
    """Пользовательский настраиваемый график в модуле Backend"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='backend_custom_charts')
    project = models.ForeignKey('FlowTestApp.Project', on_delete=models.CASCADE, related_name='backend_custom_charts', null=True)
    chart_type = models.CharField(max_length=50, 
                                 choices=[('line', 'Line'), ('bar', 'Bar'), ('pie', 'Pie'), 
                                          ('doughnut', 'Doughnut'), ('radar', 'Radar'), ('polar', 'Polar Area')])
    data_source = models.CharField(max_length=100, help_text="Name of the data source method to use")
    configuration = models.JSONField(default=dict, help_text="Full chart configuration including options and data transformations")
    is_public = models.BooleanField(default=False, help_text="Whether this chart is public for all users")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return self.name

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Permission as DjangoPermission
from django.contrib.admin.sites import NotRegistered, AlreadyRegistered
from django.utils.html import format_html
from django.db.models import Q
from django.contrib.auth.models import Group
from django.contrib.contenttypes.models import ContentType
from django.forms.widgets import SelectMultiple

from .models import (
    CustomUser, Role, Permission, Project, TestCase, 
    TestRun, Folder, AutomationProject, ReportTemplate
)

# Unregister Django's built-in models to avoid confusion
for model in [DjangoPermission, Group]:
    try:
        admin.site.unregister(model)
    except NotRegistered:
        pass

# Base ModelAdmin class with anti-duplication measures
class BaseModelAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        """Override to ensure distinct results for all admin views"""
        qs = super().get_queryset(request)
        # Использовать distinct() для всех запросов, чтобы избежать дублирования
        return qs.distinct() if hasattr(qs, 'distinct') else qs
    
    class Media:
        css = {
            'all': ('css/admin-custom.css',)
        }

# Custom ModelAdmin class to remove Django's default permissions panel in admin
class NoPermissionsModelAdmin(BaseModelAdmin):
    def has_module_permission(self, request):
        if self.model == Permission:
            return True  # Show only our custom Permission model
        return super().has_module_permission(request)

# Admin class for CustomUser
class CustomUserAdmin(UserAdmin, BaseModelAdmin):
    list_display = ('username', 'email', 'full_name', 'get_role', 'is_active', 'is_staff')
    list_filter = ('is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    list_editable = ('is_active',)
    add_form_template = 'admin/FlowTestApp/customuser/add_form.html'
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Персональная информация', {'fields': ('first_name', 'last_name', 'middle_name', 'email', 'phone_number', 'avatar')}),
        ('Настройки', {'fields': ('language', 'theme')}),
        ('Права', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'phone_number', 'avatar', 'language', 'theme'),
        }),
    )
    
    def full_name(self, obj):
        middle = f" {obj.middle_name}" if obj.middle_name else ""
        return f"{obj.first_name}{middle} {obj.last_name}"
    full_name.short_description = 'Полное имя'
    
    def get_role(self, obj):
        return obj.role if obj.role else "-"
    get_role.short_description = 'Роль'
    get_role.admin_order_field = 'role__name'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Ensure role choices are properly populated in forms"""
        if db_field.name == 'role':
            kwargs["queryset"] = Role.objects.all().order_by('name')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
    def get_urls(self):
        """Ensure custom URLs are properly generated"""
        urls = super().get_urls()
        return urls
    
    def add_view(self, request, form_url='', extra_context=None):
        """Custom add view for better styling"""
        extra_context = extra_context or {}
        extra_context['title'] = 'Добавление нового пользователя'
        return super().add_view(request, form_url, extra_context)
        
    class Media:
        css = {
            'all': ('css/admin-custom.css',)
        }

# Admin class for Permission
class PermissionAdmin(NoPermissionsModelAdmin):
    list_display = ('name', 'codename', 'colored_category', 'description')
    list_filter = ('category',)
    search_fields = ('name', 'codename', 'description')
    
    def get_queryset(self, request):
        # Получаем только пользовательские права доступа из нашей системы разрешений
        return Permission.objects.distinct().order_by('category', 'name')
    
    def colored_category(self, obj):
        """Display category with color-coding"""
        category_colors = {
            'user_management': '#4CAF50',  # Green
            'project_management': '#2196F3',  # Blue
            'test_management': '#FF9800',  # Orange
            'report_management': '#9C27B0',  # Purple
            'event_management': '#E91E63',  # Pink
            'automation_management': '#FF5722',  # Deep Orange
        }
        color = category_colors.get(obj.category, '#607D8B')  # Default gray
        
        # Перевод категорий на русский язык
        category_map = {
            'user_management': 'Управление пользователями',
            'project_management': 'Управление проектами',
            'test_management': 'Управление тестами',
            'report_management': 'Управление отчетами',
            'event_management': 'Управление событиями',
            'automation_management': 'Управление автоматизацией',
        }
        
        display_category = category_map.get(obj.category, obj.get_category_display())
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 7px; border-radius: 3px;">{}</span>',
            color,
            display_category
        )
    colored_category.short_description = 'Категория'

# Admin class for Role
class RoleAdmin(NoPermissionsModelAdmin):
    list_display = ('name', 'description_short', 'is_admin_role', 'permissions_count')
    list_filter = ('is_admin_role',)
    search_fields = ('name', 'description')
    filter_horizontal = ('permissions',)
    readonly_fields = ('is_admin_role',)
    
    def get_queryset(self, request):
        # Переопределяем метод для использования distinct() для исключения дублирования
        return super().get_queryset(request).distinct()
    
    def description_short(self, obj):
        if obj.description and len(obj.description) > 50:
            return f"{obj.description[:50]}..."
        return obj.description or ""
    description_short.short_description = 'Описание'
    
    def permissions_count(self, obj):
        return obj.permissions.distinct().count()
    permissions_count.short_description = 'Права'
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if form.base_fields.get('permissions'):
            # Группировка разрешений по категориям
            permissions_field = form.base_fields['permissions']
            permissions_field.queryset = Permission.objects.all().order_by('category', 'name')
            
            # Создаем кастомные группы опций для SelectMultiple
            permissions_field.widget.choices = self._group_permissions_by_category(
                permissions_field.queryset)
        return form
    
    def _group_permissions_by_category(self, queryset):
        # Словарь для перевода категорий
        category_map = {
            'user_management': 'Управление пользователями',
            'project_management': 'Управление проектами',
            'test_management': 'Управление тестами',
            'report_management': 'Управление отчетами',
            'event_management': 'Управление событиями',
            'automation_management': 'Управление автоматизацией',
        }
        
        # Группировка разрешений по категориям
        result = []
        current_category = None
        category_options = []
        
        for permission in queryset:
            if permission.category != current_category:
                if current_category is not None:
                    result.append((category_map.get(current_category, current_category), category_options))
                    category_options = []
                current_category = permission.category
            
            category_options.append((permission.id, permission.name))
            
        if current_category is not None and category_options:
            result.append((category_map.get(current_category, current_category), category_options))
            
        return result

# Admin for Project
class ProjectAdmin(BaseModelAdmin):
    list_display = ('name', 'description_short', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'description')
    
    def get_queryset(self, request):
        return super().get_queryset(request).distinct()
    
    def description_short(self, obj):
        if obj.description and len(obj.description) > 50:
            return f"{obj.description[:50]}..."
        return obj.description or ""
    description_short.short_description = 'Описание'

# Admin for TestCase
class TestCaseAdmin(BaseModelAdmin):
    list_display = ('title', 'project', 'folder', 'priority', 'test_type', 'created_at')
    list_filter = ('priority', 'test_type', 'project')
    search_fields = ('title', 'description')
    
    def get_queryset(self, request):
        return super().get_queryset(request).distinct()

# Admin for TestRun
class TestRunAdmin(BaseModelAdmin):
    list_display = ('test_case', 'status', 'started_at', 'finished_at', 'execution_time')
    list_filter = ('status', 'started_at')
    search_fields = ('test_case__title', 'output')
    
    def get_queryset(self, request):
        return super().get_queryset(request).distinct()

# Admin for Folder
class FolderAdmin(BaseModelAdmin):
    list_display = ('name', 'project', 'parent_folder', 'status', 'created_at')
    list_filter = ('project', 'status')
    search_fields = ('name', 'description')
    
    def get_queryset(self, request):
        return super().get_queryset(request).distinct()

# Register all models with their respective admin classes
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Role, RoleAdmin)
admin.site.register(Permission, PermissionAdmin)
admin.site.register(Project, ProjectAdmin)
admin.site.register(Folder, FolderAdmin)
admin.site.register(TestCase, TestCaseAdmin)
admin.site.register(TestRun, TestRunAdmin)

# Register other models with the base admin class for consistency
class BaseAdmin(BaseModelAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).distinct()

# Register other models
try:
    admin.site.register(AutomationProject, BaseAdmin)
    admin.site.register(ReportTemplate, BaseAdmin)
except AlreadyRegistered:
    pass

# Custom admin site title and header
admin.site.site_header = 'FlowTest Система Управления'
admin.site.site_title = 'FlowTest Админ'
admin.site.index_title = 'Управление Системой'
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from FlowTestApp.views import (
    ProjectViewSet,
    FolderViewSet,
    TestCaseViewSet,
    TestRunViewSet,
    SchedulerEventViewSet,
    CustomUserViewSet,
    RoleViewSet,
    AutomationProjectViewSet,
    test_cases_creation_stats,
    test_execution_stats,
    tests_over_time,
    results_distribution,
    priority_distribution,
    check_test_existence,
)
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'folders', FolderViewSet)
router.register(r'testcases', TestCaseViewSet)
router.register(r'testruns', TestRunViewSet)
router.register(r'events', SchedulerEventViewSet)
router.register(r'users', CustomUserViewSet, basename='users')
router.register(r'roles', RoleViewSet)
router.register(r'automation_projects', AutomationProjectViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', RedirectView.as_view(url='/api/', permanent=True)),
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Статистика
    path('api/statistics/test_cases_creation/<int:project_id>/', test_cases_creation_stats, name='test_cases_creation_stats'),
    path('api/statistics/test_execution/<int:project_id>/', test_execution_stats, name='test_execution_stats'),
    path('api/statistics/tests_over_time/<int:project_id>/', tests_over_time, name='tests_over_time'),
    path('api/statistics/results_distribution/<int:project_id>/', results_distribution, name='results_distribution'),
    path('api/statistics/priority_distribution/<int:project_id>/', priority_distribution, name='priority_distribution'),
    path('api/check-test-existence/<int:test_id>/', check_test_existence, name='check-test-existence'),
]

# Добавляем обработку медиа-файлов в режиме разработки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

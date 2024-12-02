from django.urls import path, include
from django.contrib import admin
from rest_framework.routers import DefaultRouter
from FlowTestApp.views import (
    TestCaseViewSet,
    TestRunViewSet,
    AutomationScriptViewSet,
    LoginView,
    ProjectViewSet,
    FolderViewSet,
    SchedulerEventViewSet,
    CustomUserViewSet,
    RoleViewSet,
    get_user_language,
    update_user_language
)
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'folders', FolderViewSet)
router.register(r'testcases', TestCaseViewSet)
router.register(r'testruns', TestRunViewSet)
router.register(r'automationscripts', AutomationScriptViewSet)
router.register(r'scheduler', SchedulerEventViewSet)
router.register(r'users', CustomUserViewSet)
router.register(r'roles', RoleViewSet)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', RedirectView.as_view(url='/api/', permanent=True)),
    path('api/', include(router.urls)),
    path('login/', LoginView.as_view(), name='login'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/language/', get_user_language),
    path('api/users/update_language/', update_user_language),
    path('api/users/theme/', CustomUserViewSet.as_view({'post': 'update_theme'}), name='update-theme'),
    path('api/users/update/', CustomUserViewSet.as_view({'post': 'update_user_info'}), name='user-update'),
    path('api/users/get_current_user/', CustomUserViewSet.as_view({'get': 'get_current_user'}), name='get-current-user'),
]

# Добавляем обработку медиа-файлов в режиме разработки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

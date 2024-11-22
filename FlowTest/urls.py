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
    CustomUserViewSet
)
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'folders', FolderViewSet)
router.register(r'testcases', TestCaseViewSet)
router.register(r'testruns', TestRunViewSet)
router.register(r'automationscripts', AutomationScriptViewSet)
router.register(r'scheduler', SchedulerEventViewSet)
router.register(r'users', CustomUserViewSet)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', RedirectView.as_view(url='/api/', permanent=True)),
    path('api/', include(router.urls)),
    path('login/', LoginView.as_view(), name='login'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
                ]

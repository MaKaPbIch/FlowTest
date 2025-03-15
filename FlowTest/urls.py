from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from FlowTestApp.models import CustomUser
from FlowTestApp.serializers import CustomUserSerializer

from FlowTestApp.views import (
    ProjectViewSet, FolderViewSet, TestCaseViewSet,
    RoleViewSet, CustomUserViewSet, AutomationProjectViewSet,
    TestRunViewSet, SchedulerEventViewSet, ReportTemplateViewSet,
    PermissionViewSet,
    test_cases_creation_stats, test_execution_stats, tests_over_time,
    results_distribution, priority_distribution, test_flakiness,
    TestExecutionView, TestStatusView, CheckTestExistenceView, AnalyticsView, ReportExportView, ReportDetailView,
    top_contributors
)

# Direct user creation view to avoid URL conflicts
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user_directly(request):
    """
    Create a new user with admin/staff privileges check
    """
    # Only staff/admin users can create new users
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({"detail": "You do not have permission to perform this action."}, 
                     status=status.HTTP_403_FORBIDDEN)
    
    try:
        serializer = CustomUserSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
from Backend.api.report_views import ReportTemplateViewSet as BackendReportTemplateViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

router = routers.DefaultRouter(trailing_slash=True)
router.register(r'projects', ProjectViewSet)
router.register(r'folders', FolderViewSet)
router.register(r'testcases', TestCaseViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'permissions', PermissionViewSet)
router.register(r'users', CustomUserViewSet, basename='users')
router.register(r'automation-projects', AutomationProjectViewSet)
router.register(r'test-runs', TestRunViewSet)
router.register(r'scheduler-events', SchedulerEventViewSet)
router.register(r'report-templates', ReportTemplateViewSet)

# Backend report router
backend_router = routers.DefaultRouter(trailing_slash=True)
backend_router.register(r'report-templates', BackendReportTemplateViewSet, basename='backend-report-templates')

# API URL patterns
api_patterns = [
    path('', include(router.urls)),
    path('backend/', include(backend_router.urls)),  # Include backend router with prefix
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('test-execution/', TestExecutionView.as_view(), name='test-execution'),
    path('test-status/', TestStatusView.as_view(), name='test-status'),
    path('check-test-existence/', CheckTestExistenceView.as_view(), name='check-test-existence'),
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
    path('analytics/test-cases-creation/', test_cases_creation_stats, name='test-cases-creation-stats'),
    path('analytics/test-execution/<int:project_id>/', test_execution_stats, name='test-execution-stats-path'),
    path('analytics/test-execution/', test_execution_stats, name='test-execution-stats-query'),
    path('analytics/tests-over-time/', tests_over_time, name='tests-over-time'),
    path('analytics/results-distribution/', results_distribution, name='results-distribution'),
    path('analytics/priority-distribution/', priority_distribution, name='priority-distribution'),
    path('analytics/test-flakiness/', test_flakiness, name='test-flakiness'),
    path('analytics/top-contributors/', top_contributors, name='top-contributors'),
    path('report-export/', ReportExportView.as_view(), name='report-export'),
    path('report-detail/', ReportDetailView.as_view(), name='report-detail'),
    
    # User profile endpoint
    path('users/get_current_user/', CustomUserViewSet.as_view({'get': 'get_current_user'}), name='get_current_user'),
]

def create_user_view(request):
    """
    User creation endpoint that properly uses the CustomUserSerializer
    """
    from django.http import JsonResponse
    import json
    from FlowTestApp.models import CustomUser
    from FlowTestApp.serializers import CustomUserSerializer
    from django.contrib.auth.hashers import make_password
    from rest_framework.exceptions import ValidationError
    
    # Add simple CORS headers
    def cors_response(data, status=200):
        response = JsonResponse(data, status=status)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
    
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return cors_response({})
    
    if request.method != 'POST':
        return cors_response({'error': 'Only POST method allowed'}, status=405)
    
    try:
        # Parse the request body as JSON
        if request.body:
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError as e:
                return cors_response({'error': f'Invalid JSON: {str(e)}'}, status=400)
        else:
            return cors_response({'error': 'Empty request body'}, status=400)
        
        # Use the serializer for validation
        serializer = CustomUserSerializer(data=data)
        
        if serializer.is_valid():
            try:
                # Save the user using the serializer
                user = serializer.save()
                
                # Return user data
                return cors_response({
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'middle_name': user.middle_name,
                    'is_active': user.is_active
                }, status=201)
            except Exception as e:
                return cors_response({'error': str(e)}, status=500)
        else:
            # Return validation errors from serializer
            return cors_response(serializer.errors, status=400)
    except Exception as e:
        return cors_response({'error': str(e)}, status=500)

from django.views.decorators.csrf import csrf_exempt

urlpatterns = [
    path('admin/', admin.site.urls),
    # Very simple direct user creation endpoint with CSRF exemption
    path('create-user/', csrf_exempt(create_user_view), name='create_user_view'),
    # Original paths
    path('api/users/', include('FlowTestApp.urls')),
    path('api/', include(api_patterns)),
    path('static/<path:path>', serve, {'document_root': settings.STATIC_ROOT}),
    path('media/<path:path>', serve, {'document_root': settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

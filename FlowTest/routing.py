from django.urls import re_path
from FlowTestApp.consumers import TestExecutionConsumer

websocket_urlpatterns = [
    re_path(r'ws/test_execution/(?P<test_run_id>\w+)/$', TestExecutionConsumer.as_asgi()),
]

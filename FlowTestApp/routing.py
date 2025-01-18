from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/test_execution/(?P<test_run_id>\w+)/$', consumers.TestExecutionConsumer.as_asgi()),
]

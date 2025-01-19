import json
from channels.generic.websocket import WebsocketConsumer
from channels.db import database_sync_to_async
from .models import TestRun, TestReport, TestEvent
import logging
from asgiref.sync import async_to_sync
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import User
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)

class TestExecutionConsumer(WebsocketConsumer):
    def connect(self):
        logger.info("WebSocket connect attempt")
        try:
            # Get token from query string
            query_string = parse_qs(self.scope['query_string'].decode())
            token = query_string.get('token', [None])[0]
            
            if not token:
                logger.error("No token provided")
                self.close()
                return

            try:
                # Verify the token
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                user = User.objects.get(id=user_id)
                self.scope['user'] = user
                logger.info(f"Authenticated user: {user.username}")
            except Exception as e:
                logger.error(f"Token verification failed: {str(e)}")
                self.close()
                return

            self.test_run_id = self.scope['url_route']['kwargs']['test_run_id']
            self.room_group_name = f'test_execution_{self.test_run_id}'

            # Join room group
            async_to_sync(self.channel_layer.group_add)(
                self.room_group_name,
                self.channel_name
            )

            # Accept the connection
            self.accept()
            logger.info(f"WebSocket connected for test_run_id: {self.test_run_id}")

            # Send connection confirmation
            self.send(text_data='connected')

        except Exception as e:
            logger.error(f"Error in connect: {str(e)}", exc_info=True)
            self.close()
            return

    def disconnect(self, close_code):
        logger.info(f"WebSocket disconnected with code: {close_code}")
        try:
            # Leave room group
            async_to_sync(self.channel_layer.group_discard)(
                self.room_group_name,
                self.channel_name
            )
        except Exception as e:
            logger.error(f"Error in disconnect: {str(e)}", exc_info=True)

    def receive(self, text_data):
        logger.info(f"Received WebSocket message: {text_data}")
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            message_data = text_data_json.get('data')

            if message_type == 'status_request':
                # Send current test status
                status = self.get_test_status()
                self.send(text_data=json.dumps({
                    'type': 'status',
                    'data': status
                }))
        except Exception as e:
            logger.error(f"Error in receive: {str(e)}", exc_info=True)

    def test_update(self, event):
        logger.info(f"Sending test update: {event}")
        try:
            # Send message to WebSocket
            self.send(text_data=json.dumps(event))
        except Exception as e:
            logger.error(f"Error in test_update: {str(e)}", exc_info=True)

    def get_test_status(self):
        try:
            test_run = TestRun.objects.get(id=self.test_run_id)
            return {
                'status': test_run.status,
                'started_at': test_run.created_at.isoformat() if test_run.created_at else None,
                'finished_at': test_run.finished_at.isoformat() if test_run.finished_at else None,
                'duration': test_run.duration,
                'output': test_run.log_output,
                'error': test_run.error_message
            }
        except TestRun.DoesNotExist:
            return {
                'status': 'error',
                'error': f'Test run {self.test_run_id} not found'
            }
        except Exception as e:
            logger.error(f"Error getting test status: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'error': str(e)
            }

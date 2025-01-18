import json
from channels.generic.websocket import WebsocketConsumer
from channels.db import database_sync_to_async
from .models import TestRun, TestReport, TestEvent
import logging
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

class TestExecutionConsumer(WebsocketConsumer):
    def connect(self):
        logger.info("WebSocket connect attempt")
        try:
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

            # Send initial status
            status = self.get_test_status()
            logger.info(f"Sending initial status: {status}")
            self.send(text_data=json.dumps({
                'type': 'status',
                'data': status
            }))

        except Exception as e:
            logger.error(f"Error in connect: {str(e)}", exc_info=True)
            raise

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
            # Handle any messages from client if needed
            pass
        except Exception as e:
            logger.error(f"Error in receive: {str(e)}", exc_info=True)

    def test_update(self, event):
        try:
            # Send test update to WebSocket
            logger.info(f"Sending test update: {event['data']}")
            self.send(text_data=json.dumps({
                'type': 'update',
                'data': event['data']
            }))
        except Exception as e:
            logger.error(f"Error in test_update: {str(e)}", exc_info=True)

    def get_test_status(self):
        try:
            test_run = TestRun.objects.get(id=self.test_run_id)
            test_report = TestReport.objects.filter(test_case=test_run.test_case).last()
            events = TestEvent.objects.filter(test_report=test_report).order_by('-timestamp')[:5] if test_report else []
            
            status_data = {
                'status': test_run.status,
                'execution_time': str(test_report.execution_time) if test_report and test_report.execution_time else None,
                'events': [
                    {
                        'type': event.event_type,
                        'description': event.description,
                        'timestamp': str(event.timestamp)
                    } for event in events
                ] if events else []
            }
            logger.info(f"Got test status: {status_data}")
            return status_data
        except Exception as e:
            logger.error(f"Error getting test status: {str(e)}")
            return {'status': 'error', 'error': str(e)}

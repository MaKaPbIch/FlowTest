from FlowTest.celery import debug_task

# Запускаем тестовую задачу
result = debug_task.delay()
print("Task ID:", result.id)
print("Task status:", result.status)

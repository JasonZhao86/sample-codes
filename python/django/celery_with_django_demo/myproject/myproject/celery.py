from celery import Celery
import os


# 设置环境变量
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

# 实例化一个实例
app = Celery('myproject')

# namespace='CELERY'的作用是允许你在Django配置文件中对Celery进行配置，但所有Celery配置项必须以CELERY开头，防止冲突
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动从Django的已注册app中发现任务
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

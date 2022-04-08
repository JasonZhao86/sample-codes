# coding:utf-8
from __future__ import absolute_import, unicode_literals
import os
from celery import Celery


# 指定Django默认配置文件模块
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

# 为我们的项目myproject创建一个Celery实例。这里不指定broker容易出现错误。
app = Celery("myproject")

"""
    这里指定从django的settings.py里读取celery配置，
    namespace='CELERY'的作用是允许你在Django配置文件中对Celery进行配置，
    但所有Celery配置项必须以CELERY开头，防止冲突
"""
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动从所有已注册的django app中加载任务
app.autodiscover_tasks()


# 用于测试的异步任务
@app.task(bind=True)
def debug_task(self):
    print('Request: {0!r}'.format(self.request))

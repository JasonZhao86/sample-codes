from django.db import models
from django.conf import settings
import os


class Page(models.Model):
    title = models.CharField(max_length=100, verbose_name="标题")
    body = models.TextField(verbose_name="正文")

    def __int__(self):
        return self.title

    # 静态文件URL地址，比如/media/html/page_8.html，用于模板中调用
    def get_static_page_url(self):
        return os.path.join(settings.MEDIA_URL, 'html', 'page_{}.html'.format(self.id))





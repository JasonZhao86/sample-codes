## 一、项目描述

&emsp;&emsp;使用`Django 3.0.5` + `Redis 3.4` + `Celery 5.1.2` 开发个小应用，异步生成静态HTML文件，应用不复杂，但知识点很多，非常适合新手练手。项目需求如下：

- 创建两个页面，一个用于创建页面，一个用于动态展示页面详情，并提供静态HMTL文件链接。
- 一个页面创建完成后，使用Celery异步执行生成静态HTML文件的任务。
- 使用redis作为Celery的Broker。
- 使用flower监控Celery异步任务执行情况。

<br />

&emsp;&emsp;项目完成后演示见下面动画：

![640](https://gitee.com/jasonzhao86/blog-pics/raw/master/images/640.gif)

<br />

<br />

## 二、项目开发

### 1、pip设置国内源

&emsp;&emsp;国内用户使用pip安装python包特别慢，这主要是应为国内连接国外网络不稳定。为加速python包的安装，首先将pip安装源设置为国内的镜像，比如阿里云提供的镜像。

&emsp;&emsp;linux系统修改`~/.pip/pip.conf`(没有就创建一个)， 内容如下：

```ini
[global]
index-url = https://mirrors.aliyun.com/pypi/simple/ 
```

&emsp;&emsp;windows系统直接在user目录中创建一个pip目录，如：`C:\Users\xx\pip`，新建文件`pip.ini`，内容如下:

```ini
[global]
index-url = http://mirrors.aliyun.com/pypi/simple/
```

<br />

### 2、创建项目myproject

&emsp;&emsp;使用pip命令安装Django.

```bash
pip install django==3.0.5 			# 安装Django，所用版本为3.0.5
```

&emsp;&emsp;创立一个名为myproject的项目：

```bash
django-admin startproject myproject
```
<br />

### 3、安装redis和项目依赖

&emsp;&emsp;项目中我们需要使用redis做Celery的中间人(Broker)，所以需要先安装redis数据库。redis网上教程很多，这里就简要带过了。

- Windows下载地址：https://github.com/MSOpenTech/redis/releases
- Linux下安装（Ubuntu系统)：`$ sudo apt-get install redis-server`

<br />

&emsp;&emsp;本项目还需要安装如下依赖包，你可以使用pip命令逐一安装。

``` bash
pip install redis==3.4.1
pip install celery==5.1.2
pip install eventlet 		# celery 4.0+版本以后不支持在windows运行，还需额外安装eventlet库
pip install mysqlclient==1.4.6
```

&emsp;&emsp;你还可以myproject目录下新建`requirements.txt`加入所依赖的python包及版本，然后使用`pip install -r requirements.txt`命令安装所有依赖：

```
Django==3.0.5
celery==5.1.2
redis==3.4.1
eventlet # for windows only
mysqlclient==1.4.6
flower==1.0.0
```

<br />

### 4、Celery基本配置

#### 4.1、settings.py

&emsp;&emsp;修改`settings.py`新增celery有关的配置。celery默认也是有自己的配置文件的，名为`celeryconfig.py`，但由于管理多个配置文件很麻烦，我们把celery的配置参数也写在django的配置文件里：

```python
DATABASES = {
    # 'default': {
    #     'ENGINE': 'django.db.backends.sqlite3',
    #     'NAME': BASE_DIR / 'db.sqlite3',
    # }
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'staticpage',
        'USER': 'root',
        'PASSWORD': '123.com',
        'HOST': '172.31.1.10',
        'PORT': '3306',
    }
}

# 配置celery时区，默认时UTC。
if USE_TZ:
    CELERY_TIMEZONE = TIME_ZONE

# celery配置redis作为broker。redis有16个数据库，编号0~15，这里使用第1个。
CELERY_BROKER_URL = 'redis://172.31.1.10:6379/0'

# 设置存储结果的后台
CELERY_RESULT_BACKEND = 'redis://172.31.1.10:6379/0'

# 可接受的内容格式
CELERY_ACCEPT_CONTENT = ["json"]
# 任务序列化数据格式
CELERY_TASK_SERIALIZER = "json"
# 结果序列化数据格式
CELERY_RESULT_SERIALIZER = "json"

# 可选参数：给某个任务限流
# CELERY_TASK_ANNOTATIONS = {'tasks.my_task': {'rate_limit': '10/s'}}

# 可选参数：给任务设置超时时间。超时立即中止worker
# CELERY_TASK_TIME_LIMIT = 10 * 60

# 可选参数：给任务设置软超时时间，超时抛出Exception
# CELERY_TASK_SOFT_TIME_LIMIT = 10 * 60

# 可选参数：如果使用django_celery_beat进行定时任务
# CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# 更多选项见
# https://docs.celeryproject.org/en/stable/userguide/configuration.html
```

<br />

#### 4.2、celery.py

&emsp;&emsp;在`settings.py`同级目录下新建`celery.py`，添加如下内容：

```python
# coding:utf-8
from __future__ import absolute_import, unicode_literals
import os
from celery import Celery


# 指定Django默认配置文件模块
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

# 为我们的项目myproject创建一个Celery实例
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
```

<br />

#### 4.3、`__init__.py`

&emsp;&emsp;打开`settings.py`同级目录下的`__init__.py`，添加如下内容，确保项目启动时即加载Celery实例：

```python
# coding:utf-8
from __future__ import absolute_import, unicode_literals

# 引入celery实例对象
from .celery import app as celery_app
__all__ = ("celery_app", )
```

&emsp;&emsp;新版原生的Celery已经支持了Django，不需要再借助什么`django-celery`和`celery-with-redis`这种第三方库了。

<br />

### 5、测试celery配置

&emsp;&emsp;启动redis，测试celery是否配置成功。在Django中编写和执行自己的异步任务前，一定要先测试redis和celery是否安装好并配置成功。首先你要启动redis服务。

&emsp;&emsp;启动redis服务后，你要先运行`python manage.py runserver`命令启动Django服务器（无需创建任何app)，然后再打开一个终端terminal窗口输入celery命令，启动worker：

```shell
# Linux下测试
$ celery -A myproject worker -l info

# Windows下测试
$ celery -A myproject worker -l info -P eventlet
```
&emsp;&emsp;如果你能看到`[tasks]`下所列异步任务清单如`debug_task`，以及最后一句`celery@xxxx ready`， 说明你的redis和celery都配置好了，可以开始正式工作了：
```bash
 -------------- celery@DESKTOP-J0MS855 v5.1.2 (sun-harmonics)
--- ***** -----
-- ******* ---- Windows-10-10.0.19041-SP0 2022-04-08 23:21:21
- *** --- * ---
- ** ---------- [config]
- ** ---------- .> app:         myproject:0x1f9c8835048
- ** ---------- .> transport:   redis://172.31.1.10:6379/0
- ** ---------- .> results:     redis://172.31.1.10:6379/0
- *** --- * --- .> concurrency: 8 (eventlet)
-- ******* ---- .> task events: OFF (enable -E to monitor tasks in this worker)
--- ***** -----
 -------------- [queues]
                .> celery           exchange=celery(direct) key=celery


[tasks]
  . myproject.celery.debug_task

[2022-04-08 23:21:21,439: INFO/MainProcess] Connected to redis://172.31.1.10:6379/0
[2022-04-08 23:21:21,469: INFO/MainProcess] mingle: searching for neighbors
[2022-04-08 23:21:22,570: INFO/MainProcess] mingle: all alone
[2022-04-08 23:21:22,615: INFO/MainProcess] pidbox: Connected to redis://172.31.1.10:6379/0.
[2022-04-08 23:21:22,647: WARNING/MainProcess] d:\pyenvs\django-static-page-generator-celery-redis\lib\site-packages\celery\fixups\django.py:204: UserWa
rning: Using settings.DEBUG leads to a memory
            leak, never use this setting in production environments!
  leak, never use this setting in production environments!''')

[2022-04-08 23:21:22,648: INFO/MainProcess] celery@DESKTOP-J0MS855 ready.
```

<br />

### 6、创建新应用staticpage

&emsp;&emsp;Django中创建新应用staticpage，`cd`进入`myproject`文件夹，创建一个名为`staticpage`的app：

```shell
$ python manage.py startapp staticpage
```

&emsp;&emsp;整个项目完整目录机构如下所示，项目名为`myproject`，`staticpage`为app名：

![image-20220408230124953](https://gitee.com/jasonzhao86/blog-pics/raw/master/images/image-20220408230124953.png)

&emsp;&emsp;我们将创建一个简单的`Page`模型，并编写两个视图（对应两个URLs），一个用于添加页面，一个用于展示页面详情。staticpage目录下我们将要编辑或创建5个`.py`文件，分别是`models.py`, `urls.py`, `views.py`, `forms.py`和`tasks.py`，其中前4个都是标准的Django项目文件。最后一个`tasks.py`用于存放我们自己编写的异步任务，稍后会详细讲解。

<br />

#### 6.1、models.py

&emsp;&emsp;`staticpage/models.py`：

```python
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
```

<br />

#### 6.2、urls.py

&emsp;&emsp;`staticpage/urls.py`：

```python
from django.urls import path, re_path
from . import views


urlpatterns = [
    # Create a page 创建页面
    path('', views.page_create, name='page_create'),
    # Page detail 展示页面详情。动态URL地址为/page/8/
    re_path(r'^page/(?P<pk>\d+)/$', views.page_detail, name='page_detail')
]
```

<br />

#### 6.3、views.py

&emsp;&emsp;`staticpage/views.py`：

```python
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from .forms import PageForm
from .models import Page
from .tasks import generate_static_page


def page_create(request):
    if request.method == 'POST':
        form = PageForm(request.POST)
        if form.is_valid():
            page = form.save()
            generate_static_page.delay(page.id, page.title, page.body)
            return redirect(reverse('page_detail', args=[str(page.pk)]))
    else:
        form = PageForm()
    return render(request, 'staticpage/base.html', {'form': form})


def page_detail(request, pk):
    page = get_object_or_404(Page, id=pk)
    return render(request, 'staticpage/detail.html', {'page': page})
```

<br />

#### 6.4、forms.py

&emsp;&emsp;`staticpage/forms.py`：

```python
from django.forms import ModelForm
from .models import Page


class PageForm(ModelForm):
    class Meta:
        model = Page
        exclude = ()
```

<br />

#### 6.5、tasks.py

&emsp;&emsp;从`page_create`视图函数中你可以看到我们在一个page实例存到数据库后调用了`generate_static_page`函数在后台完成静态HTML页面的生成。如果不使用异步的话，我们要等静态HTML文件完全生成后才能跳转到页面详情页面，这有可能要等好几秒。`generate_static_page`就是我们自定义的异步任务，代码如下所示。Celery可以自动发现每个Django app下的异步任务，不用担心。

&emsp;&emsp;`staticpage/tasks.py`：

```python
from celery import shared_task
from django.template.loader import render_to_string
from django.conf import settings
import os, time


@shared_task
def generate_static_page(page_id, page_title, page_body):
    # 模拟耗时任务，比如写入文件或发送邮件等操作。
    time.sleep(5)

    # 获取传递的参数
    page = {'title': page_title, 'body': page_body}
    context = {'page': page}

    # 渲染模板，生成字符串
    content = render_to_string('staticpage/template.html', context)

    # 定义生成静态文件所属目录，位于media文件夹下名为html的子文件夹里。如目录不存在，则创建。
    directory = os.path.join(settings.MEDIA_ROOT, 'html')
    if not os.path.exists(directory):
        os.makedirs(directory)

    static_html_path = os.path.join(directory, 'page_{}.html'.format(page_id))

    # 将渲染过的字符串写入目标文件
    with open(static_html_path, 'w', encoding='utf-8') as f:
        f.write(content)
```

本例中我们生成的静态HTML文件位于media文件夹下的html子文件夹里，这样做有两个好处：

- 与Django的静态文件存储规范保持一致：用户产生的静态文件都放在media文件下，网站本身所依赖的静态文件都放于static文件夹下。
- 把所有产生的静态文件放在一个目录里与动态文件相分开，利于后续通过nginx部署。

<br />

### 7、HTML页面

&emsp;&emsp;本项目中还用到了3个模板，分别是`base.html`，`detail.html`和`template.html`。`base.html`和`detail.html`是没有任何样式的仅用，于动态显示内容，`template.html`用来生成静态文件，是带样式的，这样你就可以很快区分动态页面和静态页面。由于我们后台生成静态文件至少需要5秒钟，我们在`detail.html`用javascript实现等5秒倒计时完成后显示生成的静态HTML文件地址。

&emsp;&emsp;3个模板均位于`staticpage/templates/staticpage/`文件夹下。

#### 7.1、base.html

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>添加页面</title>
    </head>
    <body>
        <h2>添加页面</h2>
        <form name="myform" method="POST" action=".">
            {% csrf_token %}
            {{ form.as_p }}
            <button type="submit">Submit</button>
        </form>
    </body>
</html>
```

<br />

#### 7.2、detail.html

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>{{ page.title }}</title>
    </head>
    <body>
        <h2>{{ page.title }}</h2>
        <p>{{ page.body }}</p>

        <p>倒计时: <span id="Time">5</span></p>
        <p id="static_url" style="display:none;">
            <small>
                <a href='{{ page.get_static_page_url }}'>跳转到静态文件</a>
            </small>
        </p>

        <script>
            //使用匿名函数方法
            function countDown(){
                var time = document.getElementById("Time");
                var p = document.getElementById("static_url");

                //获取到id为time标签中的内容，现进行判断
                if(time.innerHTML == 0){
                    //等于0时, 显示静态HTML文件URL
                    p.style.display = "block";
                }else{
                    time.innerHTML = time.innerHTML - 1;
                }
            }

            //1000毫秒调用一次
            window.setInterval("countDown()",1000);
        </script>
    </body>
</html>
```

<br />

#### 7.3、template.html

&emsp;&emsp;生成静态文件模板：

```html
{% load static %}
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>{% block title %}Django文档管理{% endblock %}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
    </head>
    <body>
        <nav class="navbar navbar-inverse navbar-static-top bs-docs-nav">
            <div class="container">
                <div class="navbar-header">
                    <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#myNavbar">
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </button>
                    <a class="navbar-brand" href="#">
                        <strong>Django + Celery + Redis异步生成静态文件</strong>
                    </a>
                </div>

                <div class="collapse navbar-collapse" id="myNavbar">
                    <ul class="nav navbar-nav navbar-right">
                        {% if request.user.is_authenticated %}
                            <li class="dropdown">
                                <a class="dropdown-toggle btn-green" data-toggle="dropdown" href="#">
                                    <span class="glyphicon glyphicon-user"></span>
                                    {{ request.user.username }}
                                    <span class="caret"></span>
                                </a>
                                <ul class="dropdown-menu">
                                    <li><a href="#">My Account</a></li>
                                    <li><a href="#">Logout</a></li>
                                </ul>
                            </li>
                        {% else %}
                            <li class="dropdown">
                                <a class="dropdown-toggle btn-green" href="#">
                                    <span class="glyphicon glyphicon-user"></span>
                                    Sign Up
                                </a>
                            </li>
                            <li class="dropdown">
                                <a class="dropdown-toggle" href="#" >
                                    <span class="glyphicon glyphicon-log-in"></span>
                                    Login
                                </a>
                            </li>
                        {% endif %}
                    </ul>
                </div>

            </div>
        </nav>

        <!-- Page content of course! -->
        <main id="section1" class="container-fluid">
            <div class="container">
                <div class="row">
                    <div class="col-sm-3 col-hide">
                        <ul>
                            <li> <a href="{% url 'page_create' %}">添加页面</a> </li>
                        </ul>
                    </div>

                    <div class="col-sm-9">
                        <h3>{{ page.title }}</h3>
                        {{ page.body }}
                    </div>
                </div>
            </div>
        </main>

        <script src="https://code.jquery.com/jquery-3.3.1.min.js"
                integrity="sha256-FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8="
                crossorigin="anonymous">
        </script>
        <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
    </body>
</html>
```

<br />

### 8、注册app和新增URLConf

#### 8.1、注册app

&emsp;&emsp;在Django中注册app，`myproject/settings.py`：

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'staticpage',
]

....

# 设置STATIC_URL和STATIC_ROOT
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# 设置MEDIA_ROOT和MEDIA_URL
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

<br />

#### 8.2、新增URLConf

&emsp;&emsp;`myproject/urls.py`：

```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('staticpage.urls')),
]


# Django自带web服务器默认不支持静态文件，需加入这两行。
if settings.DEBUG:
    urlpatterns = urlpatterns + static(settings.MEDIA_URL, 
                                       document_root=settings.MEDIA_ROOT)
    urlpatterns = urlpatterns + static(settings.STATIC_URL, 
                                       document_root=settings.STATIC_ROOT)
```

<br />

### 9、执行数据库迁移

```bash
$ python manage.py makemigrations
$ python manage.py migrate
```

<br />

### 10、启动服务验证

&emsp;&emsp;启动Django服务器和Celery服务：

```shell
# 启动django
$ python manage.py runserver

# 启动celery实例
$ celery -A myproject worker -l info -P eventlet
```

&emsp;&emsp;打开[http://127.0.0.1:8000/](http://127.0.0.1:8000/)即可看到我们项目开头的动画啦。注意：请确保redis和celery已同时开启。

<br />

### 11、启动flower

&emsp;&emsp;如果你要监控异步任务的运行状态（比如是否成功，是否有返回结果）， 还可以安装flower这个Celery监控工具：

```python
$ pip install flower==1.0.0
```

&emsp;&emsp;安装好后，有如下两种方式启动flower服务：

```bash
# 从terminal终端启动, myproject为项目名
$ flower -A myproject --port=5555  

# 从celery启动
$ celery -A myproject flower --address=127.0.0.1 --port=5555
```

&emsp;&emsp;启动flower服务后，打开[http://localhost:5555](http://localhost:5555/)即可查看监控情况，监控异步任务还是很重要的，强烈建议安装flower：

![image-20220409001505568](https://gitee.com/jasonzhao86/blog-pics/raw/master/images/image-20220409001505568.png)

<br />

<br />

## 三、reference

* [Django实战：Django 3.0 +Redis 3.4 +Celery 4.4异步生成静态HTML文件(附源码)](https://mp.weixin.qq.com/s?__biz=MjM5OTMyODA4Nw==&mid=2247484549&idx=1&sn=7d6d4fa67ed9e653b3f13f7c0030a150&chksm=a73c64bd904bedab2a6f1fced72ab8f14b901eacb2b74027df3c1261eafa3bbbfe545f4f347d&scene=21#wechat_redirect)




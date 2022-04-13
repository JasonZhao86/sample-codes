## 一、celery简介

&emsp;&emsp;Django Web项目中我们经常需要执行耗时的任务比如发送邮件、调用第三方接口、批量处理文件等等，将这些任务异步化放在后台运行可以有效缩短请求响应时间。另外服务器上经常会有定时任务的需求，比如清除缓存、备份数据库等工作。Celery是一个高效的异步任务队列/基于分布式消息传递的作业队列，可以轻松帮我们在Django项目中设置执行异步和周期性任务。

&emsp;&emsp;本文将详细演示如何在Django项目中集成Celery设置执行异步和周期性任务并总结下一些高级使用技巧和注意事项。celery的官方技术文档：[Celery - Distributed Task Queue — Celery 5.2.6 documentation](https://docs.celeryq.dev/en/stable/)

<br />

### 1、Celery的工作原理

&emsp;&emsp;Celery是一个高效的基于分布式消息传递的作业队列。它主要通过消息(messages)传递任务，通常使用一个叫Broker（中间人）来协调client（任务的发出者）和worker（任务的处理者）。clients发出消息到队列中，broker将队列中的信息派发给 Celery worker来处理。Celery本身不提供消息服务，它支持的消息服务（Broker）有RabbitMQ和Redis。小编一般推荐Redis，因为其在Django项目中还是首选的缓存后台。

&emsp;&emsp;整个工作流程如下所示：

![image-20220411095005489](https://gitee.com/jasonzhao86/blog-pics/raw/master/images/image-20220411095005489.png)

<br />

<br />

## 二、celery的基本使用

### 1、安装项目依赖文件 

&emsp;&emsp;本项目使用了Django 3.2和Celery 5。因为本项目使用Redis做消息队列的broker，所以还需要安装redis (Windows下安装和启动redis参见菜鸟教程)。另外如果你要设置定时或周期性任务，还需要安装`django-celery-beat`。

```python
# pip安装必选
Django==3.2
celery==5.1.2
redis==3.5.3
mysqlclient==1.4.6

# 可选，windows下运行celery 4以后版本，还需额外安装eventlet库
eventlet==0.33.0

# 推荐安装, 需要设置定时或周期任务时安装，推荐安装
django-celery-beat==2.2.1

# 视情况需要，需要存储任务结果时安装，视情况需要
django-celery-results==2.2.0

# 视情况需要，需要监控celery运行任务状态时安装
flower==1.0.0
```

<br />

### 2、创建django项目和app

&emsp;&emsp;创建project后，新建一个apps模块，专门用于存储所有的app应用：

```shell
$ django-admin startproject myproject
```

&emsp;&emsp;创建app，然后将app目录整个移动到apps模块下：

```shell
$ python manage.py startapp app
```

&emsp;&emsp;修改settings配置：

```python
BASE_DIR = Path(__file__).resolve().parent.parent
# 新增该项，自定义app的路径
sys.path.insert(0, os.path.join(BASE_DIR, "apps"))

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # 注册app
    'apps.app',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'staticpage',
        'USER': 'root',
        'PASSWORD': '123.com',
        'HOST': '172.31.1.10',
        'PORT': '3306',
    }
}
```

<br />

### 3、Celery配置

&emsp;&emsp;在正式使用`celery`和`django-celery-beat`之前，需要做基础的配置，首先需要在`myproject/myprojec`t目录下新增`celery.py`并修改`__init__.py`：

```shell
 - myproject/
  - apps
    - app
      - migrations
      - __init__.py
      - admin.py
      - apps.py
      - urls.py
      - views.py
      - tests.py
      - models.py
    - __init__.py
  - myproject/
    - __init__.py 		# 修改这个文件
    - celery.py 		# 新增这个文件
    - asgi.py
    - settings.py
    - urls.py
    - wsgi.py
  - manage.py
```

<br />

#### 3.1、celery.py

&emsp;&emsp;新建`myproject/celery.py`，添加如下代码：

```python
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
```

<br />

#### 3.2、`__init__.py`

&emsp;&emsp;修改`myproject/__init__.py`，如下所示：

```python
from .celery import app as celery_app

__all__ = (celery_app, )
```

<br />

#### 3.3、settings.py

&emsp;&emsp;接下来修改Django项目的`settings.py`，添加Celery有关配置选项，如下所示：

```python
# 最重要的配置，设置消息broker,格式为：db://user:password@host:port/dbname
CELERY_BROKER_URL = 'redis://172.31.1.10:6379/0'

# celery时区设置，建议与Django settings中TIME_ZONE同样时区，防止时差，Django设置时区需同时设置USE_TZ=True和TIME_ZONE = 'Asia/Shanghai'
if USE_TZ:
    CELERY_TIMEZONE = TIME_ZONE
```

&emsp;&emsp;其它Celery常用配置选项包括：

```python
"""
    为django_celery_results存储Celery任务执行结果设置后台，格式为：db+scheme://user:password@host:port/dbname
    支持数据库django-db和缓存django-cache存储任务状态及结果
"""
CELERY_RESULT_BACKEND = "redis://172.31.1.10:6379/0"

# celery内容等消息的格式设置，默认json
CELERY_ACCEPT_CONTENT = ['application/json', ]
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# 为任务设置超时时间，单位秒。超时即中止，执行下个任务。
CELERY_TASK_TIME_LIMIT = 10 * 60

# 为存储结果设置过期日期，默认1天过期。如果beat开启，Celery每天会自动清除，设为0，存储结果永不过期
CELERY_RESULT_EXPIRES = 0

# 任务限流
CELERY_TASK_ANNOTATIONS = {'tasks.add': {'rate_limit': '10/s'}}

# Worker并发数量，一般默认CPU核数，可以不设置
CELERY_WORKER_CONCURRENCY = 4

# 每个worker执行了多少任务就会死掉，默认是无限的
CELERY_WORKER_MAX_TASKS_PER_CHILD = 200
```

注意：

- 在Django中正式编写和执行自己的异步任务前，一定要先测试redis和celery是否安装好并配置成功。
- 一个无限期阻塞的任务会使得工作单元无法再做其他事情，建议给任务设置超时时间。

<br />

### 4、测试Celery是否工作正常

&emsp;&emsp;启动redis服务后，你要先进入项目所在文件夹运行`python manage.py runserver`命令启动Django服务器（无需创建任何app），然后再打开一个终端terminal窗口输入celery命令，启动worker。

```shell
# Linux下测试，启动Celery
$ Celery -A myproject worker -l info
 
# Windows下测试，启动Celery
$ Celery -A myproject worker -l info -P eventlet
 
# 如果Windows下Celery不工作，输入如下命令
$ Celery -A myproject worker -l info --pool=solo
```

&emsp;&emsp;如果你能看到[tasks]下所列异步任务清单如`debug_task`，以及最后一句celery@xxxx ready, 说明你的redis和celery都配置好了，可以开始正式工作了。

```shell
 -------------- celery@DESKTOP-J0MS855 v5.1.2 (sun-harmonics)
--- ***** -----
-- ******* ---- Windows-10-10.0.19041-SP0 2022-04-11 14:13:06
- *** --- * ---
- ** ---------- [config]
- ** ---------- .> app:         myproject:0x1cdfb7a19b0
- ** ---------- .> transport:   redis://172.31.1.10:6379/0
- ** ---------- .> results:     redis://172.31.1.10:6379/0
- *** --- * --- .> concurrency: 4 (eventlet)
-- ******* ---- .> task events: OFF (enable -E to monitor tasks in this worker)
--- ***** -----
 -------------- [queues]
                .> celery           exchange=celery(direct) key=celery


[tasks]
  . celery.accumulate
  . celery.backend_cleanup
  . celery.chain
  . celery.chord
  . celery.chord_unlock
  . celery.chunks
  . celery.group
  . celery.map
  . celery.starmap
  . myproject.celery.debug_task

[2022-04-11 14:13:06,321: DEBUG/MainProcess] | Worker: Starting Pool
[2022-04-11 14:13:06,321: DEBUG/MainProcess] ^-- substep ok
[2022-04-11 14:13:06,321: DEBUG/MainProcess] | Worker: Starting Consumer
[2022-04-11 14:13:06,321: DEBUG/MainProcess] | Consumer: Starting Connection
[2022-04-11 14:13:06,328: INFO/MainProcess] Connected to redis://172.31.1.10:6379/0
[2022-04-11 14:13:06,328: DEBUG/MainProcess] ^-- substep ok
[2022-04-11 14:13:06,328: DEBUG/MainProcess] | Consumer: Starting Events
[2022-04-11 14:13:06,333: DEBUG/MainProcess] ^-- substep ok
[2022-04-11 14:13:06,334: DEBUG/MainProcess] | Consumer: Starting Heart
[2022-04-11 14:13:06,336: DEBUG/MainProcess] ^-- substep ok
[2022-04-11 14:13:06,336: DEBUG/MainProcess] | Consumer: Starting Mingle
[2022-04-11 14:13:06,336: INFO/MainProcess] mingle: searching for neighbors
[2022-04-11 14:13:07,387: INFO/MainProcess] mingle: all alone
[2022-04-11 14:13:07,387: DEBUG/MainProcess] ^-- substep ok
[2022-04-11 14:13:07,388: DEBUG/MainProcess] | Consumer: Starting Tasks
[2022-04-11 14:13:07,392: DEBUG/MainProcess] ^-- substep ok
[2022-04-11 14:13:07,392: DEBUG/MainProcess] | Consumer: Starting Control
[2022-04-11 14:13:07,393: DEBUG/MainProcess] ^-- substep ok
[2022-04-11 14:13:07,393: DEBUG/MainProcess] | Consumer: Starting Gossip
[2022-04-11 14:13:07,411: INFO/MainProcess] pidbox: Connected to redis://172.31.1.10:6379/0.
[2022-04-11 14:13:07,415: DEBUG/MainProcess] ^-- substep ok
[2022-04-11 14:13:07,415: DEBUG/MainProcess] | Consumer: Starting event loop
[2022-04-11 14:13:07,416: WARNING/MainProcess] d:\pyenvs\celery_with_django_demo\lib\site-packages\celery\fixups\django.py:204: UserWarning: Using settings.DEBUG leads to a memory
            leak, never use this setting in production environments!
  leak, never use this setting in production environments!''')

[2022-04-11 14:13:07,416: INFO/MainProcess] celery@DESKTOP-J0MS855 ready.
[2022-04-11 14:13:07,416: DEBUG/MainProcess] basic.qos: prefetch_count->16
```

<br />

### 5、编写任务

&emsp;&emsp;Celery配置完成后，我们就可以编写任务了。Django项目中所有需要Celery执行的异步或周期性任务都放在`tasks.py`文件里，该文件可以位于project目录下，也可以位于各个app的目录下。专属于某个Celery实例化项目的task可以使用`@app.task`装饰器定义，各个app目录下可以复用的task建议使用`@shared_task`定义。

&emsp;&emsp;两个示例如下所示，专属于myproject项目的任务并没有实际测通，待后续继续研究吧：

```python
# myproject/tasks.py，专属于myproject项目的任务
app = Celery('myproject'）

@ app.task
def test()：
    pass
 
# apps/app/tasks.py, 可以复用的task
from celery import shared_task
import time
 
@shared_task
def add(x, y):
    time.sleep(2)
    return x + y
```

&emsp;&emsp;上面我们定义一个名为`add`的任务，它接收两个参数，并返回计算结果。为了模拟耗时任务，我们中途让其sleep 2秒。现在已经定义了一个耗时任务，我们希望在Django的视图或其它地方中以异步方式调用执行它，应该怎么做呢? 请继续阅读下面的内容。

**注意**：

* 使用celery定义任务时，避免在一个任务中调用另一个异步任务，容易造成阻塞。

* 当我们使用`@app.task`装饰器定义我们的异步任务时，那么这个任务依赖于根据项目名myproject生成的Celery实例。然而我们在进行Django开发时为了保证每个app的可重用性，我们经常会在每个app文件夹下编写异步任务，这些任务并不依赖于具体的Django项目名。使用`@shared_task`装饰器能让我们避免对某个项目名对应Celery实例的依赖，使app的可移植性更强。

<br />

### 6、异步调用任务

&emsp;&emsp;Celery提供了2种以异步方式调用任务的方法，`delay`和`apply_async`方法，如下所示：

```python
# 方法一：delay方法
task_name.delay(args1, args2, kwargs=value_1, kwargs2=value_2)
 
# 方法二：apply_async方法，与delay类似，但支持更多参数
task.apply_async(args=[arg1, arg2], kwargs={key:value, key:value})
```

&emsp;&emsp;我们接下来看一个具体的例子。我们编写了一个Django视图函数，使用`delay`方法调用`add`任务。

```python
# apps/app/views.py
from django.http import HttpResponse
from .tasks import add

def test_celery(request):
    add.delay(3, 5)
    return HttpResponse("Celery works(shared_task)")
 
# apps/app/urls.py
urlpatterns = [
    re_path(r'^test/$', views.test_celery, name="test_celery")
]

# myproject/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('app.urls'))
]
```

&emsp;&emsp;当你通过浏览器访问`/test/`链接时，你根本感受不到2s的延迟，页面可以秒开，同时你会发现终端的输出如下所示，显示任务执行成功。

![image-20220412105227895](https://gitee.com/jasonzhao86/blog-pics/raw/master/images/image-20220412105227895.png)

&emsp;&emsp;我们现在再次使用`apply_async`方法调用`add`任务，不过还要打印出任务的`id (task.id)`和状态`status`。Celery会为每个加入到队列的任务分配一个独一无二的uuid，你可以通过`task.status`获取状态和`task.result`获取结果。注意：`apply_async`传递参数的方式与delay方法不同：

```python
# apps/app/views.py
from django.http import HttpResponse
from .tasks import add

def test_celery(request):
    # add.delay(3, 5)
    result = add.apply_async(args=[3, 5])
    return HttpResponse(result.task_id + ":" + result.status)
```

&emsp;&emsp;Django返回响应结果如下所示。这是在预期之内的，因为耗时任务还未执行完毕，Django就已经返回了响应：

```shell
c008035d-cb92-4c32-80bc-74db19f88125:PENDING
```

&emsp;&emsp;那么问题来了，这个异步任务执行了，返回了个计算结果（8），那么我们系统性地了解任务状态并获取这个执行结果呢？答案是`django-celery-results`。

<br />

### 7、django-celery-results

&emsp;&emsp;查看任务执行状态及结果，通过pip安装`django-celery-results`后，需要将其加入到`INSTALLED_APPS` ，参考官网：[First steps with Django — Celery 5.2.6 documentation](https://docs.celeryq.dev/en/stable/django/first-steps-with-django.html#extensions)：

```python
# myproject/settings
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'apps.app',
    # 注册
    'django-celery-results',
]
```

&emsp;&emsp;以下几项配置选项是与这个库相关的。

```python
# 支持数据库django-db(Django ORM)和缓存django-cache存储任务状态及结果，建议选django-db
CELERY_RESULT_BACKEND = "django-db"

# celery内容等消息的格式设置，默认json
CELERY_ACCEPT_CONTENT = ['application/json', ]
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
```

&emsp;&emsp;并使用`migrate`命令迁移创建数据表：

```shell
$ python manage.py migrate django_celery_results

# 创建超级管理员账号
$ python manage.py createsuperuser --username zhaoxuan
```

&emsp;&emsp;安装配置完成后，访问task，并进入Django admin后台，你就可以详细看到每个任务的id、名称及状态。

![image-20220412184312080](https://gitee.com/jasonzhao86/blog-pics/raw/master/images/image-20220412184312080.png)

&emsp;&emsp;点击单个任务id，你可以看到有关这个任务的更多信息，比如传递的参数和返回结果，如下所示：

![image-20220412184412685](https://gitee.com/jasonzhao86/blog-pics/raw/master/images/image-20220412184412685.png)

<br />

#### 7.1、排障

##### 7.1.1、故障一

&emsp;&emsp;celery往数据库中插入执行结果时，报如下错误：

```shell
DatabaseWrapper objects created in a thread can only be used in that same thread." when trying to insert into database using celery
```

&emsp;&emsp;windows系统下特有的报错，重启celery实例，加入`--pool`启动选项，参考：[python - DatabaseWrapper objects created in a thread can only be used in that same thread." when trying to insert into database using celery - Stack Overflow](https://stackoverflow.com/questions/60179472/databasewrapper-objects-created-in-a-thread-can-only-be-used-in-that-same-thread)

```shell
$ celery -A myproject worker -l debug -P eventlet --pool=solo
```

<br />

##### 7.1.2、故障二

&emsp;&emsp;django admin页面展示celery results结果时，报如下错误：

```shell
ValueError: Database returned an invalid datetime value. Are time zone definitions for your database installed?
```

&emsp;&emsp;解决办法：在mysql中新增timezone时区，参考：[Fix Django timezones issue: "Database returned an invalid value in QuerySet.datetimes(). Are time zone definitions for your database and pytz installed?"](https://gist.github.com/lauris/241479d953012a2cadc7)

```shell
mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql
```

<br />

### 8、django_celery_beat

&emsp;&emsp;借助于`django-celery-beat`，项目地址：[celery/django-celery-results: Celery result back end with django](https://github.com/celery/django-celery-results)，你可以将任一Celery任务设置为定时任务或周期性任务。pip安装它，并加入`INSTALLED_APPS`，详细参考官网：[Periodic Tasks — Celery 5.2.6 documentation](https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html#beat-custom-schedulers)

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'apps.app',
    'django_celery_results',
    'django_celery_beat',
]
```

&emsp;&emsp;生成数据库表：

```shell
$ python manage.py migrate
```

&emsp;&emsp;`django-celery-beat`提供了两种添加定时或周期性任务的方式，一是直接在`settings.py`中添加，二是通过Django admin后台添加。

#### 8.1、添加周期性任务

##### 8.1.1、settings添加任务

&emsp;&emsp;同一任务可以设置成不同的调用周期，给它们不同的任务名就好了。

```python
from datetime import timedelta

CELERY_BEAT_SCHEDULE = {
    'add_every_30s': {
        "task": "apps.app.tasks.add",
        "schedule": 30.0,    # 每30秒执行1次
        'args': (3, 8)       # 传递参数
    },
    "add_every_day": {
        "task": "apps.app.tasks.add",
        'schedule': timedelta(hours=1),     # 每小时执行1次
        'args': (3, 8)      # 传递参数
    },
}
```

<br />

##### 8.1.2、Django Admin添加

&emsp;&emsp;如果每次添加或修改周期性任务都要修改配置文件非常不方便，一个更好的方式是使用任务调度器。先在`settings.py`中将任务调度器设为`DatabaseScheduler`

```python
 CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
```

&emsp;&emsp;然后就可以进入Django Admin，在`Periodic tasks`表中添加和修改周期性任务（先添加周期任务，后面再启动任务调度器beat）：

![image-20220412204648916](https://gitee.com/jasonzhao86/blog-pics/raw/master/images/image-20220412204648916.png)

<br />

#### 8.2、设置定时任务 

##### 8.2.1、settings添加任务

&emsp;&emsp;通过Crontab设置定时任务，如果你希望在特定的时间（某月某周或某天）执行一个任务，你可以通过crontab设置定时任务，如下例所示：

```python
from celery.beat import crontab

CELERY_BEAT_SCHEDULE = {
    # 每周一早上7点半执行
    'add-every-monday-morning': {
        'task': 'app.tasks.add',
        'schedule': crontab(hour=7, minute=30, day_of_week=1),
        'args': (7, 8),
   },
}
```

&emsp;&emsp;更多Crontab定义案例如下所示：

| 例子                                                         | 含义                                                         |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| `crontab()`                                                  | 每分                                                         |
| `crontab(minute=0, hour=0)`                                  | 每天午夜                                                     |
| `crontab(minute=0, hour='*/3')`                              | 能被3整除的小时数，3，6，9点等等                             |
| `crontab(minute=0, hour='0,3,6,9,12,15,18,21')`              | 与前面相同，指定小时                                         |
| `crontab(minute='*/15')`                                     | 每15分钟                                                     |
| `crontab(day_of_week='sunday')`                              | 星期日每分钟                                                 |
| `crontab(minute='*', hour='*', day_of_week='sun')`           | 同上                                                         |
| `crontab(minute='*/10', hour='3,17,22', day_of_week='thu,fri')` | 每10分钟运行一次, 但仅限于周四或周五的 3-4 am, 5-6 pm, 和10-11 pm. |
| `crontab(minute=0, hour='*/2,*/3')`                          | 可以被2或3整除的小时数，除了 1am, 5am, 7am, 11am, 1pm, 5pm, 7pm, 11pm |
| `crontab(minute=0, hour='*/5')`                              | 可以被5整除的小时                                            |
| `crontab(minute=0, hour='*/3,8-17')`                         | 8am-5pm之间可以被3整除的小时                                 |
| `crontab(0, 0, day_of_month='2')`                            | 每个月的第2天                                                |
| `crontab(0, 0, day_of_month='2-30/2')`                       | 每月的偶数日                                                 |
| `crontab(0, 0, day_of_month='1-7,15-21')`                    | 每月的第一和第三周                                           |
| `crontab(0, 0, day_of_month='11', month_of_year='5')`        | 每年的5月11日                                                |
| `crontab(0, 0, month_of_year='*/3')`                         | 每个季度首个月份每天                                         |

<br />

##### 8.2.2、Django Admin添加

&emsp;&emsp;Crontab也可以通过Django Admin添加，在`Crontabs`表中新增一条记录，与任务进行绑定：

![image-20220412204737139](https://gitee.com/jasonzhao86/blog-pics/raw/master/images/image-20220412204737139.png)

&emsp;&emsp;如果更换了时区timezone，比如从'UTC'变成了'Asia/Shanghai'，需重置周期性任务，这非常重要：

```shell
# 调整timezone后重置任务
$ python manage.py shell
>>> from django_celery_beat.models import PeriodicTask
>>> PeriodicTask.objects.update(last_run_at=None)
```

&emsp;&emsp;前面我们只是添加了定时或周期性任务，我们还需要启动任务调度器beat分发定时和周期任务给Celery的worker。

<br />

#### 8.3、启动任务调度器beat

&emsp;&emsp;多开几个终端，一个用来启动任务调度器beat，另一个启动celery worker，你的任务就可以在后台执行啦。

```shell
# 开启任务调度器
$ Celery -A myproject beat
 
# Linux下开启Celery worker
$ Celery -A myproject worker -l info
 
# windows下开启Celery worker
$ Celery -A myproject worker -l info -P eventlet
 
# windows下如果报Pid错误
$ Celery -A myproject worker -l info --pool=solo
```

&emsp;&emsp;输入如下此信息代表beat工作正常：

```shell
celery beat v5.1.2 (sun-harmonics) is starting.
__    -    ... __   -        _
LocalTime -> 2022-04-12 20:40:04
Configuration ->
    . broker -> redis://172.31.1.10:6379/0
    . loader -> celery.loaders.app.AppLoader
    . scheduler -> django_celery_beat.schedulers.DatabaseScheduler

    . logfile -> [stderr]@%WARNING
    . maxinterval -> 5.00 seconds (5s)

```

&emsp;&emsp;此时再回到Django admin的`task result`表，就可以看到已经执行过了的任务：

<br />

### 9、flower

&emsp;&emsp;除了`django_celery_results`，还可以使用`flower`监控后台任务的执行状态。它提供了一个可视化的界面，在测试环境中非常有用：

```shell
$ pip install flower
```

&emsp;&emsp;修改`CELERY_RESULT_BACKEND`，改为redis：

```python
# CELERY_RESULT_BACKEND = "django-db"
CELERY_RESULT_BACKEND = "redis://172.31.1.10:6379/0"

# celery内容等消息的格式设置，默认json
CELERY_ACCEPT_CONTENT = ['application/json', ]
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
```

&emsp;&emsp;安装好后，你有如下两种方式启动服务器。启动服务器：

```shell
# 从terminal终端启动, proj为项目名
$ flower -A myproject --port=5555  
 
# 从celery启动
$ celery -A myproject flower --address=127.0.0.1 --port=5555
```

&emsp;&emsp;打开http://localhost:5555即可查看监控情况，全都是上面周期性和定时执行的job：

![image-20220413141009231](https://gitee.com/jasonzhao86/blog-pics/raw/master/images/image-20220413141009231.png)

<br />

<br />

## 三、Celery高级用法与注意事项

### 1、给任务设置最大重试次数

&emsp;&emsp;定义任务时可以通过`max_retries`设置最大重试次数，并调用`self.retry`方法调用。因为要调用`self`这个参数，定义任务时必须设置`bind=True`。

```python
@shared_task(bind=True, max_retries=3)
def send_batch_notifications(self):
   try:
       something_raising()
       raise Exception('Can\'t send email.')
   except Exception as exc:
       self.retry(exc=exc, countdown=5)
   send_mail(
       subject='Batch email notifications',
       message='Test email',
       from_email='no-reply@example.com',
       recipient_list=['john@example.com']
   )
```

<br />

### 2、不同任务交由不同Queue处理

&emsp;&emsp;不同的任务所需要的资源和时间不一样的。为了防止一些非常占用资源或耗时的任务阻塞任务队列导致一些简单任务也无法执行，可以将不同任务交由不同的Queue处理。下例定义了两个Queue队列，default执行普通任务，heavy_tasks执行重型任务：

```python
CELERY_TASK_DEFAULT_QUEUE = 'default'
CELERY_TASK_DEFAULT_ROUTING_KEY = 'default'

CELERY_QUEUES = (
   Queue('default', Exchange('default'), routing_key='default'),
   Queue('heavy_tasks', Exchange('heavy_tasks'), routing_key='heavy_tasks'),
)

CELERY_TASK_ROUTES = {
   'myapp.tasks.heave_tasks': 'heavy_tasks'
}
```

<br />

### 3、忽略不想要的结果

&emsp;&emsp;如果你不在意任务的返回结果，可以设置 `ignore_result`选项，因为存储结果耗费时间和资源。你还可以可以通过 `task_ignore_result` 设置全局忽略任务结果：

```python
@app.task(ignore_result=True)
def my_task():
    something()
```

<br />

### 4、避免启动同步子任务

&emsp;&emsp;让一个任务等待另外一个任务的返回结果是很低效的，并且如果worker工作单元池被耗尽的话这将会导致死锁：

```python
# 错误的例子
@app.task
def update_page_info(url):
    page = fetch_page.delay(url).get()
    info = parse_page.delay(url, page).get()
    store_page_info.delay(url, info)
 
@app.task
def fetch_page(url):
    return myhttplib.get(url)

@app.task
def parse_page(url, page):
    return myparser.parse_document(page)

@app.task
def store_page_info(url, info):
    return PageInfo.objects.create(url, info)
```

&emsp;&emsp;正确的例子，关于`s`，实际上就是signature的缩写，其作用相当于python的partial偏函数，详细参考：[Celery 进阶使用 - Celery 中文手册](https://www.celerycn.io/ru-men/celery-jin-jie-shi-yong#yuan-yu)：

```python
def update_page_info(url):
    chain = fetch_page.s(url) | parse_page.s() | store_page_info.s(url)
    chain()
 
@app.task()
def fetch_page(url):
    return myhttplib.get(url)

@app.task()
def parse_page(page):
    return myparser.parse_document(page)

@app.task(ignore_result=True)
def store_page_info(info, url):
    PageInfo.objects.create(url=url, info=info)
```

&emsp;&emsp;在好例子里，我们将不同的任务签名链接起来创建一个任务链，**三个子任务按顺序执行**。

<br />

### 5、Django的模型对象不应该作为参数传递

&emsp;&emsp;Django 的模型对象不应该作为参数传递给任务。几乎总是在任务运行时从数据库获取对象是最好的，因为老的数据会导致竞态条件。假象有这样一个场景，你有一篇文章，以及自动展开文章中缩写的任务：

```python
class Article(models.Model):
    title = models.CharField()
    body = models.TextField()
 
@app.task
def expand_abbreviations(article):
    article.body.replace('Old text', 'New text')
    article.save()
```

&emsp;&emsp;首先，作者创建一篇文章并保存，这时作者点击一个按钮初始化一个缩写展开任务：

```shell
>>> article = Article.objects.get(id=102)
>>> expand_abbreviations.delay(article)
```

&emsp;&emsp;现在，队列非常忙，所以任务在2分钟内都不会运行。与此同时，另一个作者修改了这篇文章，当这个任务最终运行，因为老版本的文章作为参数传递给了这个任务，所以这篇文章会回滚到老的版本。修复这个竞态条件很简单，只要参数传递文章的 id 即可，此时可以在任务中重新获取这篇文章：

```python
@app.task
def expand_abbreviations(article_id):
    article = Article.objects.get(id=article_id)
    article.body.replace('MyCorp', 'My Corporation')
    article.save()
```

<br />

### 6、使用on_commit函数处理事务

&emsp;&emsp;我们再看另外一个celery中处理事务的例子。这是在数据库中创建一个文章对象的 Django 视图，此时传递主键给任务。它使用 **`commit_on_success`** 装饰器，当视图返回时该事务会被提交，当视图抛出异常时会进行回滚。

```python
from django.db import transaction

@transaction.commit_on_success
def create_article(request):
    article = Article.objects.create()
    expand_abbreviations.delay(article.pk)
```

&emsp;&emsp;如果在事务提交之前任务已经开始执行会产生一个竞态条件；数据库对象还不存在。解决方案是使用 **`on_commit`** 回调函数来在所有事务提交成功后启动任务。

```python
from django.db.transaction import on_commit

def create_article(request):
    article = Article.objects.create()
    on_commit(lambda: expand_abbreviations.delay(article.pk))
```

<br />

<br />

## 四、reference

* [Django进阶：万字长文教你使用Celery执行异步和周期性任务(多图)](https://mp.weixin.qq.com/s/m-lKF_D440bOU9nqszw6Mw)




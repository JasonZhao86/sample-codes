"""
Django settings for myproject project.

Generated by 'django-admin startproject' using Django 3.2.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.2/ref/settings/
"""

from pathlib import Path
import sys, os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, os.path.join(BASE_DIR, "apps"))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-0dz63l28#5rfg)+gjgboccb5ltgif(8c=-0xlf@7m(td5a%z0&'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

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

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'myproject.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'myproject.wsgi.application'


# Database
# https://docs.djangoproject.com/en/3.2/ref/settings/#databases

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


# Password validation
# https://docs.djangoproject.com/en/3.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/3.2/topics/i18n/

# LANGUAGE_CODE = 'en-us'
LANGUAGE_CODE = 'zh-hans'

# TIME_ZONE = 'UTC'
TIME_ZONE = 'Asia/Shanghai'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.2/howto/static-files/

STATIC_URL = '/static/'

# Default primary key field type
# https://docs.djangoproject.com/en/3.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ?????????????????????????????????broker,????????????db://user:password@host:port/dbname
CELERY_BROKER_URL = 'redis://172.31.1.10:6379/0'

# celery????????????????????????Django settings???TIME_ZONE??????????????????????????????Django???????????????????????????USE_TZ=True???TIME_ZONE = 'Asia/Shanghai'
if USE_TZ:
    CELERY_TIMEZONE = TIME_ZONE

"""
    ???django_celery_results??????Celery?????????????????????????????????????????????db+scheme://user:password@host:port/dbname
    ???????????????django-db?????????django-cache???????????????????????????
"""
# CELERY_RESULT_BACKEND = "redis://172.31.1.10:6379/0"
CELERY_RESULT_BACKEND = "django-db"

# celery???????????????????????????????????????json
CELERY_ACCEPT_CONTENT = ['application/json', ]
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# ?????????????????????????????????????????????????????????????????????????????????
CELERY_TASK_TIME_LIMIT = 10 * 60

# ??????????????????????????????????????????1??????????????????beat?????????Celery??????????????????????????????0???????????????????????????
CELERY_RESULT_EXPIRES = 0

# ????????????
CELERY_TASK_ANNOTATIONS = {'tasks.add': {'rate_limit': '10/s'}}

# Worker???????????????????????????CPU????????????????????????
CELERY_WORKER_CONCURRENCY = 4

# ??????worker??????????????????????????????????????????????????????
CELERY_WORKER_MAX_TASKS_PER_CHILD = 200


# from datetime import timedelta
# from celery.beat import crontab
#
# CELERY_BEAT_SCHEDULE = {
#     'add-every-30s': {
#         "task": "apps.app.tasks.add",
#         "schedule": 30.0,    # ???30?????????1???
#         'args': (3, 8)       # ????????????
#     },
#     "add-every-day": {
#         "task": "apps.app.tasks.add",
#         'schedule': timedelta(hours=1),     # ???????????????1???
#         'args': (3, 8)      # ????????????
#     },
#     "add-every-monday-morning": {
#         'task': 'app.tasks.add',
#         'schedule': crontab(hour=7, minute=30, day_of_week=1),
#         'args': (7, 8),
#     }
# }

CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'


from django.http import HttpResponse
from .tasks import add
from tasks import print_test


def test_celery(request):
    # add.delay(3, 5)
    result = add.apply_async(args=[3, 5])
    return HttpResponse(result.task_id + ":" + result.status)


def test_celery2(request):
    print("fuck")
    print_test.delay()
    return HttpResponse("Celery works2(app.task)")


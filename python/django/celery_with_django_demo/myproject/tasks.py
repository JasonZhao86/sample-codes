from celery import Celery


app = Celery("myproject")


@app.task
def print_test():
    print("专属于myproject项目的任务，app.task")


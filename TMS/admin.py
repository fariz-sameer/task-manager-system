from django.contrib import admin

from django.contrib import admin
from .models import Task, TaskActivity
from .models import FollowerRemark

admin.site.register(Task)
admin.site.register(TaskActivity)
admin.site.register(FollowerRemark)

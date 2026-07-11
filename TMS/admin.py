from django.contrib import admin

from django.contrib import admin
from .models import Task, TaskActivity

admin.site.register(Task)
admin.site.register(TaskActivity)
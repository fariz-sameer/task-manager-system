from django.contrib import admin

from .models import Company, Task, TaskActivity
from .models import FollowerRemark

admin.site.register(Company)
admin.site.register(Task)
admin.site.register(TaskActivity)
admin.site.register(FollowerRemark)

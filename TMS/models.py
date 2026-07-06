from django.db import models
from django.contrib.auth.models import User

class Task(models.Model):

    class Status(models.TextChoices):
        NEW = "NEW", "New"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        COMPLETED = "COMPLETED", "Completed"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="tasks"
    )

    title = models.CharField(max_length=200)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW
    )

    assigned_to = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="assigned_tasks"
)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
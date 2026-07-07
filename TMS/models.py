from django.db import models
from django.contrib.auth.models import User

class Task(models.Model):

    class Status(models.TextChoices):
        NEW = "NEW", "New"
        URGENT = "URGENT", "Urgent"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        PENDING = "PENDING", "Pending"
        FOR_DISCUSSION = "FOR_DISCUSSION", "For Discussion"
        NOT_READY = "NOT_READY", "Not Ready"
        FINISHED = "FINISHED", "Finished"
        COMPLETED = "COMPLETED", "Completed"
        CLOSED_TO_REOPEN = "CLOSED_TO_REOPEN", "Closed to Reopen"
        CANCELLED = "CANCELLED", "Cancelled"
        
        # UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        


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

    # assigned_to = models.ForeignKey(
    #     User,
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name="assigned_tasks"
    # )
    assigned_to = models.ManyToManyField(
        User,
        blank=True,
        related_name="assigned_tasks"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
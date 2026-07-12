from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Task(models.Model):
    class Company(models.TextChoices):
        ARACO = "ARACO", "ARACO"
        JODAH = "JODAH", "JODAH"
        XYZ = "XYZ", "XYZ Company"

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

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    assigned_to = models.ManyToManyField(
        User, blank=True, related_name="assigned_tasks"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    company_name = models.CharField(
        max_length=20, choices=Company.choices, default=Company.ARACO
    )
    task_details = models.TextField(blank=True)
    deadline = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.title


class TaskActivity(models.Model):
    class ActivityType(models.TextChoices):
        SYSTEM = "SYSTEM", "System"
        COMMENT = "COMMENT", "Comment"

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="activities")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    activity_type = models.CharField(
        max_length=10, choices=ActivityType.choices, default=ActivityType.SYSTEM
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.task.title}"


class TaskReadStatus(models.Model):
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="read_statuses"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    last_seen = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("task", "user")


class ActivityAttachment(models.Model):

    activity = models.ForeignKey(
        TaskActivity, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="activity_attachments/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

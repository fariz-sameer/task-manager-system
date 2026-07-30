from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.conf import settings


class Company(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


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

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    assigned_to = models.ManyToManyField(
        User, blank=True, related_name="assigned_tasks"
    )
    followers = models.ManyToManyField(User, blank=True, related_name="following_tasks")
    created_at = models.DateTimeField(auto_now_add=True)
    company_name = models.ForeignKey(
        Company,
        on_delete=models.PROTECT,
    )
    task_details = models.TextField(blank=True)
    deadline = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.title

    ai_summary = models.TextField(blank=True, null=True)
    ai_summary_updated = models.DateTimeField(blank=True, null=True)


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


class FollowerRemark(models.Model):

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="remarks")

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    message = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:

        ordering = ["-created_at"]

    def __str__(self):

        return f"{self.user.username}: {self.message[:40]}"


class UserTaskStatus(models.Model):

    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="user_statuses"
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    status = models.CharField(
        max_length=20, choices=Task.Status.choices, default=Task.Status.NEW
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("task", "user")

    def __str__(self):
        return f"{self.user.username} - {self.task.title} ({self.status})"


class ExecutiveDigest(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="executive_digests"
    )

    digest_date = models.DateField()

    summary = models.TextField()

    generated_at = models.DateTimeField(auto_now_add=True)

    last_activity_at = models.DateTimeField()

    class Meta:
        unique_together = ("user", "digest_date")
        ordering = ["-generated_at"]

    def __str__(self):
        return f"{self.user.username} - {self.digest_date}"

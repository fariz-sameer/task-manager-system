from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required

from django.db.models import Q
from django.contrib.auth.models import User

from .models import (
    Task,
    TaskActivity,
    TaskReadStatus,
    ActivityAttachment,
    FollowerRemark,
    UserTaskStatus,
    ExecutiveDigest,
)
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta
from .forms import SignUpForm

from .ai import (
    summarize_activities,
    executive_daily_digest,
)

from collections import defaultdict

ASSIGNEE_EDITABLE_STATUSES = {
    Task.Status.NEW,
    Task.Status.IN_PROGRESS,
    Task.Status.PENDING,
    Task.Status.FOR_DISCUSSION,
    Task.Status.NOT_READY,
    Task.Status.FINISHED,
}

LOCKED_STATUSES = [
    Task.Status.COMPLETED,
    Task.Status.CLOSED_TO_REOPEN,
    Task.Status.CANCELLED,
]


from django.db import connection
from django.http import JsonResponse


def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()

        return JsonResponse(
            {
                "status": "ok",
                "database": "ok",
            },
            status=200,
        )
    except Exception as exc:
        return JsonResponse(
            {
                "status": "error",
                "database": str(exc),
            },
            status=503,
        )


def prepare_task(task, user):

    latest_activity = task.activities.order_by("-created_at").first()

    task.unread_count = 0

    if latest_activity:
        read_status, _ = TaskReadStatus.objects.get_or_create(
            task=task,
            user=user,
        )

        if latest_activity.created_at > read_status.last_seen:
            task.unread_count = task.activities.filter(
                created_at__gt=read_status.last_seen
            ).count()

    task.assignee_can_edit = (
        user in task.assigned_to.all()
        and user != task.user
        and user not in task.followers.all()
        and task.status not in LOCKED_STATUSES
    )

    # -------------------------------
    # Determine visible status
    # -------------------------------

    if task.status in LOCKED_STATUSES:

        # Completed / Closed / Cancelled
        # everyone sees the owner's status

        task.display_status = task.status

    elif user == task.user or user in task.followers.all():

        # Owner and followers see overall status

        task.display_status = task.status

    else:

        # Assignees see their personal status

        user_status = UserTaskStatus.objects.filter(task=task, user=user).first()

        task.display_status = user_status.status if user_status else task.status

    return task


# ADD THIS BACK


def prepare_tasks(tasks, user):

    for task in tasks:
        prepare_task(task, user)

    return tasks


@login_required
def home(request):

    tasks = (
        Task.objects.filter(
            Q(user=request.user)
            | Q(assigned_to=request.user)
            | Q(followers=request.user)
        )
        .distinct()
        .prefetch_related("assigned_to", "followers")
    )

    # ---------------- Filters ----------------

    status_filter = request.GET.get("status")
    owner_filter = request.GET.get("owner")
    assignee_filter = request.GET.get("assignee")
    deadline_filter = request.GET.get("deadline")
    # if status_filter:
    #     tasks = tasks.filter(status=status_filter)
    if status_filter:

        tasks = [task for task in tasks if task.display_status == status_filter]
    if owner_filter:
        tasks = tasks.filter(user__id=owner_filter)
    if assignee_filter:
        tasks = tasks.filter(assigned_to__id=assignee_filter)

    today = timezone.localdate()

    if deadline_filter:
        if deadline_filter == "OVERDUE":
            tasks = tasks.filter(deadline__lt=today)
        elif deadline_filter == "TODAY":
            tasks = tasks.filter(deadline=today)
        elif deadline_filter == "TOMORROW":
            tasks = tasks.filter(deadline=today + timedelta(days=1))
        elif deadline_filter == "THIS_WEEK":
            end_of_week = today + timedelta(days=6)
            tasks = tasks.filter(deadline__range=(today, end_of_week))
        elif deadline_filter == "THIS_MONTH":
            tasks = tasks.filter(deadline__year=today.year, deadline__month=today.month)
        elif deadline_filter == "NEXT_MONTH":
            if today.month == 12:
                next_month = 1
                next_year = today.year + 1
            else:
                next_month = today.month + 1
                next_year = today.year
            tasks = tasks.filter(deadline__year=next_year, deadline__month=next_month)

    tasks = tasks.order_by("-created_at")
    users = User.objects.exclude(id=request.user.id)
    tasks = prepare_tasks(tasks, request.user)

    latest_digest = ExecutiveDigest.objects.filter(user=request.user).first()

    return render(
        request,
        "home.html",
        {
            "tasks": tasks,
            "Status": Task.Status,
            "Company": Task.Company,
            "users": users,
            "status_filter": status_filter,
            "owner_filter": owner_filter,
            "assignee_filter": assignee_filter,
            "deadline_filter": deadline_filter,
            "latest_digest": latest_digest,
        },
    )


@login_required
def add_task(request):
    if request.method != "POST":
        return JsonResponse(
            {"success": False, "error": "Invalid request method."}, status=400
        )

    title = request.POST.get("title")
    company_name = request.POST.get("company_name")
    deadline = request.POST.get("deadline")
    task_details = request.POST.get("task_details", "")
    task = Task.objects.create(
        user=request.user,
        title=title,
        company_name=company_name,
        deadline=deadline if deadline else None,
        task_details=task_details,
        status=Task.Status.NEW,
    )
    task.assigned_to.add(request.user)

    UserTaskStatus.objects.create(
        task=task,
        user=request.user,
        status=Task.Status.NEW,
    )

    TaskActivity.objects.create(
        task=task, user=request.user, message="created the task."
    )

    task.ai_summary = None
    task.ai_summary_updated = None
    task.save(
        update_fields=[
            "ai_summary",
            "ai_summary_updated",
        ]
    )

    return JsonResponse({"success": True, "task_id": task.id})


@login_required
def assign_task(request, task_id):

    task = Task.objects.get(id=task_id, user=request.user)

    if request.method == "POST":

        # Get current values BEFORE updating
        old_assignees = set(task.assigned_to.values_list("id", flat=True))
        old_assignees.add(request.user.id)

        old_followers = set(task.followers.values_list("id", flat=True))

        selected_users = request.POST.getlist("assigned_to")

        selected_followers = request.POST.getlist("followers")

        # Prevent same person being both
        selected_followers = [
            follower
            for follower in selected_followers
            if follower not in selected_users
        ]

        # Convert to sets for comparison
        new_assignees = set(map(int, selected_users))
        new_assignees.add(request.user.id)

        new_followers = set(map(int, selected_followers))

        # Update database
        task.assigned_to.set(selected_users)

        # Always keep owner as assignee
        task.assigned_to.add(request.user)

        for user in task.assigned_to.all():

            UserTaskStatus.objects.get_or_create(
                task=task, user=user, defaults={"status": Task.Status.NEW}
            )

        task.followers.set(selected_followers)

        # Only create activity if assignees changed
        if old_assignees != new_assignees:

            usernames = list(task.assigned_to.values_list("username", flat=True))

            TaskActivity.objects.create(
                task=task,
                user=request.user,
                message=f"updated assignees to: {', '.join(usernames)}.",
            )
            task.ai_summary = None
            task.ai_summary_updated = None
            task.save(
                update_fields=[
                    "ai_summary",
                    "ai_summary_updated",
                ]
            )

        # Only create activity if followers changed
        if old_followers != new_followers:

            usernames = list(task.followers.values_list("username", flat=True))

            TaskActivity.objects.create(
                task=task,
                user=request.user,
                message=f"updated followers to: {', '.join(usernames)}.",
            )
            task.ai_summary = None
            task.ai_summary_updated = None
            task.save(
                update_fields=[
                    "ai_summary",
                    "ai_summary_updated",
                ]
            )

        return JsonResponse({"success": True})

    return JsonResponse({"success": False}, status=400)


@login_required
def update_status(request, task_id):
    task = get_object_or_404(Task, id=task_id)

    if task.status in LOCKED_STATUSES and request.user != task.user:
        return JsonResponse(
            {
                "success": False,
                "error": "This task is locked. Only the owner can change the status.",
            },
            status=403,
        )

    if request.user in task.followers.all():
        return JsonResponse(
            {
                "success": False,
                "error": "Followers cannot change the task status.",
            },
            status=403,
        )
    # Only the owner or an assignee can update the status
    if request.user != task.user and request.user not in task.assigned_to.all():
        return JsonResponse(
            {
                "success": False,
                "error": "You do not have permission to update this task.",
            },
            status=403,
        )

    if request.method != "POST":
        return JsonResponse(
            {"success": False, "error": "Invalid request method."}, status=400
        )

    new_status = request.POST.get("status")
    if not new_status:
        return JsonResponse({"success": False, "error": "Missing status."}, status=400)

    # Statuses only the owner can set
    owner_only_statuses = [
        Task.Status.URGENT,
        Task.Status.COMPLETED,
        Task.Status.CLOSED_TO_REOPEN,
        Task.Status.CANCELLED,
    ]

    # Assignee trying to use an owner-only status
    if request.user != task.user and new_status in owner_only_statuses:
        return JsonResponse(
            {"success": False, "error": "Only the task owner can select that status."},
            status=403,
        )

    # ---------------- OWNER ----------------

    if request.user == task.user:

        old_display = task.get_status_display()

        task.status = new_status
        task.save()

        UserTaskStatus.objects.update_or_create(
            task=task, user=request.user, defaults={"status": new_status}
        )

        new_display = task.get_status_display()

        if old_display != new_display:

            TaskActivity.objects.create(
                task=task,
                user=request.user,
                message=f"changed the overall task status from '{old_display}' to '{new_display}'.",
            )
            task.ai_summary = None
            task.ai_summary_updated = None
            task.save(
                update_fields=[
                    "ai_summary",
                    "ai_summary_updated",
                ]
            )

    # ---------------- ASSIGNEE ----------------

    else:

        user_status, _ = UserTaskStatus.objects.get_or_create(
            task=task, user=request.user, defaults={"status": Task.Status.NEW}
        )

        old_display = user_status.get_status_display()

        user_status.status = new_status
        user_status.save()

        new_display = user_status.get_status_display()

        if old_display != new_display:

            TaskActivity.objects.create(
                task=task,
                user=request.user,
                message=f"changed their status from '{old_display}' to '{new_display}'.",
            )
            task.ai_summary = None
            task.ai_summary_updated = None
            task.save(
                update_fields=[
                    "ai_summary",
                    "ai_summary_updated",
                ]
            )

    return JsonResponse({"success": True})


@login_required
def delete_task(request, task_id):
    task = get_object_or_404(Task, id=task_id, user=request.user)
    task.delete()
    return JsonResponse({"success": True})


def signup(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        form = SignUpForm(request.POST)

        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("home")
    else:
        form = SignUpForm()

    return render(request, "signup.html", {"form": form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    form = AuthenticationForm(request, data=request.POST or None)

    if request.method == "POST":
        if form.is_valid():
            login(request, form.get_user())
            return redirect("home")

    return render(request, "login.html", {"form": form})


@login_required
def task_data(request, task_id):
    task = get_object_or_404(Task, id=task_id)

    TaskReadStatus.objects.update_or_create(
        task=task, user=request.user, defaults={"last_seen": timezone.now()}
    )

    # Only owner or assignees can view
    if (
        request.user != task.user
        and request.user not in task.assigned_to.all()
        and request.user not in task.followers.all()
    ):
        return JsonResponse({"error": "Permission denied"}, status=403)
    # Determine status visible to current user

    if task.status in LOCKED_STATUSES:

        # Completed / Closed / Cancelled overrides personal statuses

        visible_status = task.status
        visible_status_display = task.get_status_display()
        status_context = "Overall Task Status"

    elif request.user == task.user or request.user in task.followers.all():

        visible_status = task.status
        visible_status_display = task.get_status_display()
        status_context = "Overall Task Status"

    else:

        user_status = UserTaskStatus.objects.filter(
            task=task, user=request.user
        ).first()

        if user_status:

            visible_status = user_status.status
            visible_status_display = user_status.get_status_display()
            status_context = "Your Status"

        else:

            visible_status = task.status
            visible_status_display = task.get_status_display()
            status_context = "Overall Task Status"

    return JsonResponse(
        {
            "current_user": request.user.username,
            "is_owner": request.user == task.user,
            "is_assignee": request.user in task.assigned_to.all(),
            "is_follower": request.user in task.followers.all(),
            "id": task.id,
            "title": task.title,
            "company": task.get_company_name_display(),
            "deadline": (
                task.deadline.strftime("%d %b %Y") if task.deadline else "No deadline"
            ),
            "status": visible_status_display,
            "status_value": visible_status,
            "status_context": status_context,
            "ai_summary": task.ai_summary,
            "owner": task.user.username,
            "details": task.task_details,
            "assignees": [user.username for user in task.assigned_to.all()],
            "followers": [user.username for user in task.followers.all()],
            "activities": [
                {
                    "id": activity.id,
                    "user": activity.user.username,
                    "message": activity.message,
                    "time": timezone.localtime(activity.created_at).strftime(
                        "%d %b %Y %H:%M"
                    ),
                    "type": activity.activity_type,
                    "owner": activity.user.username,
                    "attachments": [
                        {
                            "url": attachment.file.url,
                            "name": attachment.file.name.split("/")[-1],
                        }
                        for attachment in activity.attachments.all()
                    ],
                }
                for activity in task.activities.all()
            ],
            "remarks": [
                {
                    "id": remark.id,
                    "user": remark.user.username,
                    "message": remark.message,
                    "time": timezone.localtime(remark.created_at).strftime(
                        "%d %b %Y %H:%M"
                    ),
                    "owner": remark.user.username,
                    "can_edit": request.user == remark.user,
                    "can_delete": (
                        request.user == remark.user or request.user == task.user
                    ),
                }
                for remark in task.remarks.all()
            ],
        }
    )


@login_required
def add_task_comment(request, task_id):
    task = get_object_or_404(Task, id=task_id)

    # Only the owner or an assignee can post updates
    if request.user != task.user and request.user not in task.assigned_to.all():
        return JsonResponse({"success": False}, status=403)

    if request.method == "POST":
        message = request.POST.get("message", "").strip()
        files = request.FILES.getlist("files")

        # Don't create an empty activity
        if not message and not files:
            return JsonResponse(
                {"success": False, "error": "Message or attachment required."},
                status=400,
            )
        MAX_TOTAL_SIZE = 10 * 1024 * 1024  # 10 MB

        total_size = sum(file.size for file in request.FILES.getlist("files"))

        if total_size > MAX_TOTAL_SIZE:

            return JsonResponse(
                {
                    "success": False,
                    "message": "The total attachment size cannot exceed 10 MB.",
                },
                status=400,
            )
        # Create the activity
        activity = TaskActivity.objects.create(
            task=task,
            user=request.user,
            message=message,
            activity_type=TaskActivity.ActivityType.COMMENT,
        )

        task.ai_summary = None
        task.ai_summary_updated = None
        task.save(
            update_fields=[
                "ai_summary",
                "ai_summary_updated",
            ]
        )

        # Save all uploaded files
        for file in files:
            ActivityAttachment.objects.create(activity=activity, file=file)

        return JsonResponse({"success": True})
    return JsonResponse({"success": False}, status=400)


@login_required
def delete_activity(request, activity_id):
    activity = get_object_or_404(TaskActivity, id=activity_id)
    task = activity.task

    # Only task owner OR comment owner can delete
    if request.user != task.user and request.user != activity.user:
        return JsonResponse({"success": False}, status=403)

    task = activity.task

    activity.delete()

    task.ai_summary = None
    task.ai_summary_updated = None
    task.save(
        update_fields=[
            "ai_summary",
            "ai_summary_updated",
        ]
    )
    return JsonResponse({"success": True})


@login_required
def edit_activity(request, activity_id):
    activity = get_object_or_404(TaskActivity, id=activity_id)

    if request.user != activity.user:
        return JsonResponse({"success": False}, status=403)

    if request.method == "POST":
        message = request.POST.get("message", "").strip()
        if message:
            activity.message = message
            activity.save()
            activity.task.ai_summary = None
            activity.task.ai_summary_updated = None
            activity.task.save(
                update_fields=[
                    "ai_summary",
                    "ai_summary_updated",
                ]
            )

        return JsonResponse({"success": True})
    return JsonResponse({"success": False}, status=400)


@login_required
def task_table_partial(request):
    tasks = (
        Task.objects.prefetch_related(
            "assigned_to",
            "followers",
        )
        .filter(
            Q(user=request.user)
            | Q(assigned_to=request.user)
            | Q(followers=request.user)
        )
        .distinct()
    )

    #
    # COPY THE FILTER CODE
    #
    # FROM home()
    #
    # ---------------- Filters ----------------

    status_filter = request.GET.get("status")
    owner_filter = request.GET.get("owner")
    assignee_filter = request.GET.get("assignee")
    deadline_filter = request.GET.get("deadline")
    # if status_filter:
    #     tasks = tasks.filter(status=status_filter)
    if owner_filter:
        tasks = tasks.filter(user__id=owner_filter)
    if assignee_filter:
        tasks = tasks.filter(assigned_to__id=assignee_filter)

    today = timezone.localdate()

    if deadline_filter:
        if deadline_filter == "OVERDUE":
            tasks = tasks.filter(deadline__lt=today)
        elif deadline_filter == "TODAY":
            tasks = tasks.filter(deadline=today)
        elif deadline_filter == "TOMORROW":
            tasks = tasks.filter(deadline=today + timedelta(days=1))
        elif deadline_filter == "THIS_WEEK":
            end_of_week = today + timedelta(days=6)
            tasks = tasks.filter(deadline__range=(today, end_of_week))
        elif deadline_filter == "THIS_MONTH":
            tasks = tasks.filter(deadline__year=today.year, deadline__month=today.month)
        elif deadline_filter == "NEXT_MONTH":
            if today.month == 12:
                next_month = 1
                next_year = today.year + 1
            else:
                next_month = today.month + 1
                next_year = today.year
            tasks = tasks.filter(deadline__year=next_year, deadline__month=next_month)

    tasks = tasks.order_by("-created_at")

    tasks = list(tasks)

    prepare_tasks(tasks, request.user)

    if status_filter:

        tasks = [task for task in tasks if task.display_status == status_filter]

    return render(
        request,
        "task_table.html",
        {
            "tasks": tasks,
            "Status": Task.Status,
        },
    )


@login_required
def add_follower_remark(request, task_id):

    task = get_object_or_404(Task, id=task_id)

    if request.user not in task.followers.all():

        return JsonResponse({"success": False}, status=403)

    if request.method == "POST":

        message = request.POST.get("message", "").strip()

        if not message:

            return JsonResponse({"success": False}, status=400)

        FollowerRemark.objects.create(task=task, user=request.user, message=message)

        return JsonResponse({"success": True})

    return JsonResponse({"success": False}, status=400)


@login_required
def edit_follower_remark(request, remark_id):

    remark = get_object_or_404(FollowerRemark, id=remark_id)

    if request.user != remark.user:
        return JsonResponse({"success": False}, status=403)

    message = request.POST.get("message", "").strip()

    if message:
        remark.message = message
        remark.save()

    return JsonResponse({"success": True})


@login_required
def delete_follower_remark(request, remark_id):

    remark = get_object_or_404(FollowerRemark, id=remark_id)

    if request.user != remark.user and request.user != remark.task.user:
        return JsonResponse({"success": False}, status=403)

    remark.delete()

    return JsonResponse({"success": True})


@login_required
def task_status_distribution(request, task_id):

    task = get_object_or_404(Task, id=task_id)

    if (
        request.user != task.user
        and request.user not in task.assigned_to.all()
        and request.user not in task.followers.all()
    ):
        return JsonResponse({"error": "Permission denied"}, status=403)

    # Locked statuses
    if task.status in LOCKED_STATUSES:

        return JsonResponse(
            {
                "labels": [task.get_status_display()],
                "values": [task.assigned_to.count()],
                "users": {
                    task.get_status_display(): [
                        user.username for user in task.assigned_to.all()
                    ]
                },
            }
        )

    status_counts = {}
    status_users = {}

    user_statuses = UserTaskStatus.objects.filter(
        task=task, user__in=task.assigned_to.all()
    ).select_related("user")

    for user_status in user_statuses:

        status_name = user_status.get_status_display()

        status_counts[status_name] = status_counts.get(status_name, 0) + 1

        if status_name not in status_users:
            status_users[status_name] = []

        status_users[status_name].append(user_status.user.username)

    return JsonResponse(
        {
            "labels": list(status_counts.keys()),
            "values": list(status_counts.values()),
            "users": status_users,
        }
    )


@login_required
def generate_ai_summary(request, task_id):

    task = get_object_or_404(Task, id=task_id)

    # Return cached summary if it already exists
    if task.ai_summary:
        return JsonResponse(
            {
                "summary": task.ai_summary,
                "cached": True,
            }
        )

    activities = (
        TaskActivity.objects.filter(task=task)
        .select_related("user")
        .order_by("created_at")
    )

    activity_text = ""

    for activity in activities:
        activity_text += (
            f"{timezone.localtime(activity.created_at):%d %b %Y %H:%M} - "
            f"{activity.user.username}: "
            f"{activity.message}\n"
        )

    summary = summarize_activities(activity_text)

    task.ai_summary = summary
    task.ai_summary_updated = timezone.now()
    task.save(update_fields=["ai_summary", "ai_summary_updated"])

    return JsonResponse({"summary": summary})


@login_required
def executive_digest(request):

    selected_date = request.GET.get("date")

    if not selected_date:
        return JsonResponse(
            {"success": False, "error": "Please provide a date."},
            status=400,
        )

    activities = (
        TaskActivity.objects.filter(created_at__date=selected_date)
        .select_related("task", "user")
        .order_by("created_at")
    )

    grouped_tasks = defaultdict(list)

    for activity in activities:
        grouped_tasks[activity.task].append(activity)

    log_text = ""

    for task, task_activities in grouped_tasks.items():

        log_text += f"""
    ==================================================
    Company: {task.get_company_name_display()}

    Task: {task.title}

    Overall Status: {task.get_status_display()}

    Activities:
    """

        for activity in task_activities:

            log_text += (
                f"\n• "
                f"{timezone.localtime(activity.created_at).strftime('%H:%M')} - "
                f"{activity.user.username}: "
                f"{activity.message}"
            )

        log_text += "\n\n"

        if not log_text.strip():
            return JsonResponse(
                {
                    "success": True,
                    "summary": "No task activity found for the selected date.",
                }
            )

        latest_activity = activities.order_by("-created_at").first()

        cached_digest = ExecutiveDigest.objects.filter(
            user=request.user, digest_date=selected_date
        ).first()

        # --------------------------
        # CACHE HIT
        # --------------------------
        if (
            cached_digest
            and latest_activity
            and cached_digest.last_activity_at >= latest_activity.created_at
        ):

            return JsonResponse(
                {
                    "success": True,
                    "summary": cached_digest.summary,
                    "generated_at": timezone.localtime(
                        cached_digest.generated_at
                    ).strftime("%d-%m-%Y %H:%M"),
                    "cached": True,
                }
            )

        # --------------------------
        # CACHE MISS
        # --------------------------

        summary = executive_daily_digest(log_text)

        digest, created = ExecutiveDigest.objects.update_or_create(
            user=request.user,
            digest_date=selected_date,
            defaults={
                "summary": summary,
                "last_activity_at": latest_activity.created_at,
            },
        )

        return JsonResponse(
            {
                "success": True,
                "summary": summary,
                "generated_at": timezone.localtime(digest.generated_at).strftime(
                    "%d-%m-%Y %H:%M"
                ),
                "cached": False,
            }
        )

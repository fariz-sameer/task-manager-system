from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required

from django.db.models import Q
from django.contrib.auth.models import User

from .models import Task, TaskActivity, TaskReadStatus, ActivityAttachment
from .forms import SignUpForm
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta

ASSIGNEE_EDITABLE_STATUSES = {
    Task.Status.IN_PROGRESS,
    Task.Status.PENDING,
    Task.Status.FOR_DISCUSSION,
    Task.Status.NOT_READY,
    Task.Status.FINISHED,
}


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
        user != task.user and task.status in ASSIGNEE_EDITABLE_STATUSES
    )

    return task


def prepare_tasks(tasks, user):
    for task in tasks:
        prepare_task(task, user)

    return tasks


@login_required
def home(request):

    tasks = (
        Task.objects.prefetch_related("assigned_to")
        .filter(Q(user=request.user) | Q(assigned_to=request.user))
        .distinct()
    )

    # ---------------- Filters ----------------

    status_filter = request.GET.get("status")
    owner_filter = request.GET.get("owner")
    assignee_filter = request.GET.get("assignee")
    deadline_filter = request.GET.get("deadline")
    if status_filter:
        tasks = tasks.filter(status=status_filter)
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

    TaskActivity.objects.create(
        task=task, user=request.user, message="created the task."
    )

    return JsonResponse({"success": True, "task_id": task.id})


@login_required
# def assign_task(request, task_id):
#     task = Task.objects.get(id=task_id, user=request.user)

#     if request.method == "POST":

#         user = User.objects.get(
#             id=request.POST["assigned_to"])

#         # task.assigned_to = user
#         # task.save()
#         task.assigned_to.set([user])


#     return redirect("home")
def assign_task(request, task_id):
    task = Task.objects.get(id=task_id, user=request.user)
    if request.method == "POST":
        selected_users = request.POST.getlist("assigned_to")
        _ = list(task.assigned_to.values_list("username", flat=True))
        task.assigned_to.set(selected_users)
        task.assigned_to.add(request.user)
        new_users = list(task.assigned_to.values_list("username", flat=True))

        TaskActivity.objects.create(
            task=task,
            user=request.user,
            message=f"updated assignees to: {', '.join(new_users)}.",
        )

        return JsonResponse({"success": True})

    return JsonResponse({"success": False}, status=400)


# @login_required
# def update_status(request, task_id):

#     task = Task.objects.get(
#         id=task_id,
#         user=request.user
#     )

#     if request.method == "POST":

#         old_display = task.get_status_display()

#         new_status = request.POST["status"]

#         task.status = new_status

#         new_display = task.get_status_display()

#         task.save()

#         TaskActivity.objects.create(
#             task=task,
#             user=request.user,
#             message=f"changed the status from '{old_display}' to '{new_display}'."
#         )

#     return redirect("home")


@login_required
def update_status(request, task_id):
    task = get_object_or_404(Task, id=task_id)

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
        Task.Status.NEW,
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

    old_display = task.get_status_display()
    task.status = new_status
    task.save()
    new_display = task.get_status_display()

    if old_display != new_display:
        TaskActivity.objects.create(
            task=task,
            user=request.user,
            message=f"changed the status from '{old_display}' to '{new_display}'.",
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
    if request.user != task.user and request.user not in task.assigned_to.all():
        return JsonResponse({"error": "Permission denied"}, status=403)

    return JsonResponse(
        {
            "current_user": request.user.username,
            "is_owner": request.user == task.user,
            "id": task.id,
            "title": task.title,
            "company": task.get_company_name_display(),
            "deadline": (
                task.deadline.strftime("%d %b %Y") if task.deadline else "No deadline"
            ),
            "status": task.get_status_display(),
            "owner": task.user.username,
            "details": task.task_details,
            "assignees": [user.username for user in task.assigned_to.all()],
            "activities": [
                {
                    "id": activity.id,
                    "user": activity.user.username,
                    "message": activity.message,
                    "time": activity.created_at.strftime("%d %b %Y %H:%M"),
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
        }
    )


# @login_required
# def add_task_comment(request, task_id):

#     task = get_object_or_404(Task, id=task_id)

#     if (
#         request.user != task.user
#         and
#         request.user not in task.assigned_to.all()
#     ):
#         return JsonResponse(
#             {"success": False},
#             status=403
#         )

#     if request.method == "POST":

#         message = request.POST.get("message", "").strip()

#         if message:

#             TaskActivity.objects.create(

#                 task=task,

#                 user=request.user,

#                 message=message,

#                 activity_type=TaskActivity.ActivityType.COMMENT

#             )
#             for file in request.FILES.getlist("files"):

#                 ActivityAttachment.objects.create(

#                     activity=activity,

#                     file=file

#                 )

#         return JsonResponse(
#             {"success": True}
#         )

#     return JsonResponse(
#         {"success": False},
#         status=400
#     )


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

        # Create the activity
        activity = TaskActivity.objects.create(
            task=task,
            user=request.user,
            message=message,
            activity_type=TaskActivity.ActivityType.COMMENT,
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

    activity.delete()
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

        return JsonResponse({"success": True})
    return JsonResponse({"success": False}, status=400)


@login_required
def task_table_partial(request):
    tasks = (
        Task.objects.prefetch_related("assigned_to")
        .filter(Q(user=request.user) | Q(assigned_to=request.user))
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
    if status_filter:
        tasks = tasks.filter(status=status_filter)
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
    prepare_tasks(tasks, request.user)

    return render(
        request,
        "task_table.html",
        {
            "tasks": tasks,
            "Status": Task.Status,
        },
    )

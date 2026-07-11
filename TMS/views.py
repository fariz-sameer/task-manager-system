from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required

from django.contrib.auth import authenticate
from django.contrib import messages
from django.db.models import Q
from django.contrib.auth.models import User

from .models import Task, TaskActivity, TaskReadStatus
from .forms import SignUpForm
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta


@login_required
@login_required
def home(request):

    tasks = Task.objects.prefetch_related(
        "assigned_to"
    ).filter(

        Q(user=request.user) |
        Q(assigned_to=request.user)

    ).distinct()

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

            tasks = tasks.filter(
                deadline=today + timedelta(days=1)
            )

        elif deadline_filter == "THIS_WEEK":

            end_of_week = today + timedelta(days=6)

            tasks = tasks.filter(

                deadline__range=(today, end_of_week)

            )

        elif deadline_filter == "THIS_MONTH":

            tasks = tasks.filter(

                deadline__year=today.year,

                deadline__month=today.month

            )

    tasks = tasks.order_by("-created_at")

    users = User.objects.exclude(id=request.user.id)

    for task in tasks:

        latest_activity = task.activities.order_by("-created_at").first()

        task.unread_count = 0

        if latest_activity:

            read_status, created = TaskReadStatus.objects.get_or_create(

                task=task,

                user=request.user

            )

            if latest_activity.created_at > read_status.last_seen:

                task.unread_count = task.activities.filter(

                    created_at__gt=read_status.last_seen

                ).count()

    return render(request, "home.html", {

        "tasks": tasks,

        "Status": Task.Status,

        "Company": Task.Company,

        "users": users,

        "status_filter": status_filter,

        "owner_filter": owner_filter,

        "assignee_filter": assignee_filter,

        "deadline_filter": deadline_filter,

    })

@login_required
def add_task(request):
    if request.method == "POST":
        title = request.POST.get("title")

        company_name = request.POST.get(
            "company_name"
        )

        deadline = request.POST.get(
            "deadline"
        )

        task_details = request.POST.get(
            "task_details",
            ""
        )

        task = Task.objects.create(

            user=request.user,

            title=title,

            company_name=company_name,

            deadline=deadline if deadline else None,

            task_details=task_details,

            status=Task.Status.NEW

        )
        
    task.assigned_to.add(request.user)

    TaskActivity.objects.create(
        task=task,
        user=request.user,
        message="created the task."
    )

    return redirect('home')

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

    task = Task.objects.get(

        id=task_id,

        user=request.user

    )

    if request.method == "POST":

        selected_users = request.POST.getlist("assigned_to")

        old_users = list(
            task.assigned_to.values_list(
                "username",
                flat=True
            )
        )

        task.assigned_to.set(selected_users)

        task.assigned_to.add(request.user)

        new_users = list(
            task.assigned_to.values_list(
                "username",
                flat=True
            )
        )

        TaskActivity.objects.create(
            task=task,
            user=request.user,
            message=f"updated assignees to: {', '.join(new_users)}."
        )

        

    return redirect("home")

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
    if (
        request.user != task.user
        and
        request.user not in task.assigned_to.all()
    ):
        messages.error(
            request,
            "You do not have permission to update this task."
        )
        return redirect("home")

    if request.method == "POST":

        new_status = request.POST["status"]

        # Statuses only the owner can set
        owner_only_statuses = [

            Task.Status.NEW,

            Task.Status.URGENT,

            Task.Status.COMPLETED,

            Task.Status.CLOSED_TO_REOPEN,

            Task.Status.CANCELLED,

        ]

        # Assignee trying to use an owner-only status
        if (
            request.user != task.user
            and
            new_status in owner_only_statuses
        ):

            messages.error(

                request,

                "Only the task owner can select that status."

            )

            return redirect("home")

        old_display = task.get_status_display()

        task.status = new_status

        task.save()

        new_display = task.get_status_display()

        if old_display != new_display:

            TaskActivity.objects.create(

                task=task,

                user=request.user,

                message=f"changed the status from '{old_display}' to '{new_display}'."

            )

    return redirect("home")

@login_required
def delete_task(request, task_id):
    task = Task.objects.get(
    id=task_id,
    user=request.user
)
    task.delete()
    return redirect('home')


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

        task=task,

        user=request.user,

        defaults={

            "last_seen": timezone.now()

        }

    )

    # Only owner or assignees can view
    if (
        request.user != task.user and
        request.user not in task.assigned_to.all()
    ):
        return JsonResponse(
            {"error": "Permission denied"},
            status=403
        )

    return JsonResponse({

        "current_user": request.user.username,

        "is_owner": request.user == task.user,

        "id": task.id,

        "title": task.title,

        "company": task.get_company_name_display(),

        "deadline": (
            task.deadline.strftime("%d %b %Y")
            if task.deadline
            else "No deadline"
        ),

        "status": task.get_status_display(),

        "owner": task.user.username,

        "details": task.task_details,

        "assignees": [
            user.username
            for user in task.assigned_to.all()
        ],
        
        "activities": [

            {

                "id": activity.id,

                "user": activity.user.username,

                "message": activity.message,

                "time": activity.created_at.strftime("%d %b %Y %H:%M"),

                "type": activity.activity_type,

                "owner": activity.user.username,

            }

            for activity in task.activities.all()

        ]
        
    })

@login_required
def add_task_comment(request, task_id):

    task = get_object_or_404(Task, id=task_id)

    if (
        request.user != task.user
        and
        request.user not in task.assigned_to.all()
    ):
        return JsonResponse(
            {"success": False},
            status=403
        )

    if request.method == "POST":

        message = request.POST.get("message", "").strip()

        if message:

            TaskActivity.objects.create(

                task=task,

                user=request.user,

                message=message,

                activity_type=TaskActivity.ActivityType.COMMENT

            )

        return JsonResponse(
            {"success": True}
        )

    return JsonResponse(
        {"success": False},
        status=400
    )

@login_required
def delete_activity(request, activity_id):

    activity = get_object_or_404(
        TaskActivity,
        id=activity_id
    )

    task = activity.task

    # Only task owner OR comment owner can delete
    if request.user != task.user and request.user != activity.user:
        return JsonResponse(
            {"success": False},
            status=403
        )

    activity.delete()

    return JsonResponse(
        {"success": True}
    )

@login_required
def edit_activity(request, activity_id):

    activity = get_object_or_404(
        TaskActivity,
        id=activity_id
    )

    if request.user != activity.user:
        return JsonResponse(
            {"success": False},
            status=403
        )

    if request.method == "POST":

        message = request.POST.get(
            "message",
            ""
        ).strip()

        if message:

            activity.message = message

            activity.save()

        return JsonResponse(
            {"success": True}
        )

    return JsonResponse(
        {"success": False},
        status=400
    )
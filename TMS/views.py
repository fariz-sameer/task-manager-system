from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required

from django.contrib.auth import authenticate
from django.contrib import messages
from django.db.models import Q
from django.contrib.auth.models import User

from .models import Task
from .forms import SignUpForm

@login_required
def home(request):
    
    # tasks = Task.objects.filter(
    #     Q(user=request.user) |
    #     Q(assigned_to=request.user)
    # ).distinct().order_by("-created_at")

    tasks = Task.objects.prefetch_related(
            "assigned_to"
        ).filter(

            Q(user=request.user) |
            Q(assigned_to=request.user)

        ).distinct().order_by("-created_at")
    
    users = User.objects.exclude(
        id=request.user.id
    )
    #This loads all assigned users efficiently.

    return render(request, "home.html", {
        "tasks": tasks,
        "Status": Task.Status,
        "users": users
    })

@login_required
def add_task(request):
    if request.method == "POST":
        title = request.POST.get('title')
        task = Task.objects.create(

        user=request.user,

        title=title,

        status=Task.Status.NEW

    )
    task.assigned_to.add(request.user)

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

        selected_users = request.POST.getlist(
            "assigned_to"
        )

        task.assigned_to.set(selected_users)

        # Always keep the owner assigned
        task.assigned_to.add(request.user)

        

    return redirect("home")

@login_required
def update_status(request, task_id):

    task = Task.objects.get(
        id=task_id,
        user=request.user
    )

    if request.method == "POST":

        task.status = request.POST.get("status")
        task.save()

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
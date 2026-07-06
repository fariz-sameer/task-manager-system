from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required

from django.contrib.auth import authenticate
from django.contrib import messages

from .models import Task
from .forms import SignUpForm

@login_required
def home(request):
    tasks = Task.objects.filter(
        user=request.user 
    ).order_by('-created_at')
    return render(request,"home.html",
        {
            "tasks": tasks,
            "Status": Task.Status,
        }
    )

@login_required
def add_task(request):
    if request.method == "POST":
        title = request.POST.get('title')
        Task.objects.create(
        user=request.user,
        title=title
        )
    return redirect('home')

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
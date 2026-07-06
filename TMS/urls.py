from django.urls import path
from django.contrib.auth.views import LogoutView
from . import views

urlpatterns = [
    path("", views.home, name="home"),

    path("add/", views.add_task, name="add_task"),
    path("status/<int:task_id>/", views.update_status, name="update_status"),
    path("delete/<int:task_id>/", views.delete_task, name="delete_task"),

    path("login/", views.login_view, name="login"),
    path("signup/", views.signup, name="signup"),
    path("logout/", LogoutView.as_view(next_page="login"), name="logout"),
    
]
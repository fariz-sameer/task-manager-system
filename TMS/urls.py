from django.urls import path
from django.contrib.auth.views import LogoutView
from django.contrib.auth import views as auth_views
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("", views.home, name="home"),
    path("add/", views.add_task, name="add_task"),
    path("status/<int:task_id>/", views.update_status, name="update_status"),
    path("delete/<int:task_id>/", views.delete_task, name="delete_task"),
    path("login/", views.login_view, name="login"),
    path("signup/", views.signup, name="signup"),
    path("logout/", LogoutView.as_view(next_page="login"), name="logout"),
    path("assign/<int:task_id>/", views.assign_task, name="assign_task"),
    path(
        "password-reset/",
        auth_views.PasswordResetView.as_view(template_name="password_reset.html"),
        name="password_reset",
    ),
    path(
        "password-reset/done/",
        auth_views.PasswordResetDoneView.as_view(
            template_name="password_reset_done.html"
        ),
        name="password_reset_done",
    ),
    path(
        "reset/<uidb64>/<token>/",
        auth_views.PasswordResetConfirmView.as_view(
            template_name="password_reset_confirm.html"
        ),
        name="password_reset_confirm",
    ),
    path(
        "reset/done/",
        auth_views.PasswordResetCompleteView.as_view(
            template_name="password_reset_complete.html"
        ),
        name="password_reset_complete",
    ),
    path("task/<int:task_id>/data/", views.task_data, name="task_data"),
    path(
        "task/<int:task_id>/comment/",
        views.add_task_comment,
        name="add_task_comment",
    ),
    path(
        "activity/<int:activity_id>/delete/",
        views.delete_activity,
        name="delete_activity",
    ),
    path(
        "activity/<int:activity_id>/edit/",
        views.edit_activity,
        name="edit_activity",
    ),
    path(
        "table/",
        views.task_table_partial,
        name="task_table_partial",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
# Serve uploaded media files during development

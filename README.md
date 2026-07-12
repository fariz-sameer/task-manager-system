# Task Manager System

Task Manager System is a Django-based web application for creating,
assigning, tracking, and updating tasks. It includes authentication,
password reset flows, task activity tracking, and media uploads for
task-related attachments.

## Overview

- `/` - task dashboard/home page
- `/login/` - sign in
- `/signup/` - sign up
- `/logout/` - sign out
- `/add/` - create a task
- `/assign/<task_id>/` - assign a task
- `/status/<task_id>/` - update task status
- `/delete/<task_id>/` - delete a task
- `/admin/` - Django admin

Password reset pages are also available at the standard reset routes defined
in the project URL configuration.

## Project Structure

- `TaskManagementSystem/` - project settings, URL routing, and WSGI/ASGI entry points
- `TMS/` - main task management app, including models, views, forms,
  templates, and migrations
- `templates/` - shared HTML templates
- `static/` - static assets such as CSS

## For Contributors

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, `uv` installation,
and pre-commit hook instructions.

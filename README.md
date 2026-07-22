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

## Running With Docker

The repository includes a `docker-compose.yaml` file that starts Postgres and
the Django web app.

1. Make sure Docker Desktop is running.
2. From the repository root, start the stack:

```powershell
docker compose up --build
```

The web container runs database migrations automatically and then starts the
development server at <http://localhost:8000>.

To stop the containers, run:

```powershell
docker compose down
```

## Running With Tilt

Tilt uses the same compose file and adds small shortcuts for common Django
tasks.

1. Install Tilt and make sure Docker is running.
2. From the repository root, start Tilt:

```powershell
tilt up
```

3. Open the Tilt UI at <http://localhost:10350>.

The app is still served on <http://localhost:8000>. In the Tilt UI, you can
also run the built-in buttons for `Make Migrations` and `Collect Static`.

## For Contributors

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, `uv` installation,
and pre-commit hook instructions.

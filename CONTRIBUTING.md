# Contributing

This repository uses `uv` for Python environment management and `pre-commit`
for local quality checks.

## Prerequisites

- Python 3.12 or newer
- `uv` installed locally

## Install `uv`

On Windows, the quickest install is:

```powershell
irm https://astral.sh/uv/install.ps1 | iex
```

After installation, open a new terminal and verify it is available:

```powershell
uv --version
```

## Set Up The Project

From the repository root, install dependencies:

```powershell
uv sync
```

This creates the local virtual environment and installs the packages defined
in `pyproject.toml`.

If you need to run Django commands, use `uv run` so they execute inside the
project environment:

```powershell
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py runserver
```

## Pre-Commit Hooks

This project uses two pre-commit hooks:

- `black` for Python formatting
- `markdownlint-cli2` for Markdown formatting

Install the hooks once per clone:

```powershell
uv run pre-commit install
```

Run the hooks across the full repository before committing changes:

```powershell
uv run pre-commit run --all-files
```

If you want to check a single staged commit, just run `git commit` as usual.
The hooks will execute automatically before the commit is created.

## Development Tips

- Re-run `uv sync` whenever dependencies change in `pyproject.toml`.
- If you change models, generate and apply migrations before restarting the
  app.
- Use `uv run python manage.py test` to run the test suite inside the project
  environment.

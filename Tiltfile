load('ext://uibutton', 'cmd_button')
docker_compose("docker-compose.dev.yaml")

dc_resource("db")
dc_resource("web")

cmd_button(
    "Make Migrations",
    argv=[
        "docker", "compose", "exec", "-T",
        "web",
        "uv", "run", "python", "manage.py", "makemigrations",
    ],
    resource="web",
)

cmd_button(
    "Run Migrations",
    argv=[
        "docker", "compose", "exec", "-T",
        "web",
        "uv", "run", "python", "manage.py", "migrate",
    ],
    resource="web",
)

cmd_button(
    "Collect Static",
    argv=[
        "docker", "compose", "exec", "-T",
        "web",
        "uv", "run", "python", "manage.py", "collectstatic", "--noinput",
    ],
    resource="web",
)
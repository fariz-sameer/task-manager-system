load('ext://uibutton', 'cmd_button')
COMPOSE_FILE = "docker-compose.dev.yaml"

docker_compose(COMPOSE_FILE)

dc_resource("db")
dc_resource("web")

cmd_button(
    "Make Migrations",
    argv=[
        "docker", "compose", "-f", COMPOSE_FILE, "exec", "-T",
        "web",
        "uv", "run", "python", "manage.py", "makemigrations",
    ],
    resource="web",
)

cmd_button(
    "Run Migrations",
    argv=[
        "docker", "compose", "-f", COMPOSE_FILE, "exec", "-T",
        "web",
        "uv", "run", "python", "manage.py", "migrate",
    ],
    resource="web",
)

cmd_button(
    "Collect Static",
    argv=[
        "docker", "compose", "-f", COMPOSE_FILE, "exec", "-T",
        "web",
        "uv", "run", "python", "manage.py", "collectstatic", "--noinput",
    ],
    resource="web",
)
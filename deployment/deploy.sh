#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="/opt/task-manager-system"
COMPOSE_FILE="docker-compose.prod.yaml"

log() {
    echo
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting deployment"

# Ensure we're in the expected project directory
if [[ ! -f "$PROJECT_DIR/manage.py" ]]; then
    echo "ERROR: manage.py not found in $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

log "Fetching latest code"
git fetch origin
git reset --hard origin/main

log "Pulling latest Docker images"
docker compose -f "$COMPOSE_FILE" pull

log "Starting containers"
docker compose -f "$COMPOSE_FILE" up -d

log "Waiting for web container to be ready"
sleep 5

log "Applying database migrations"
docker compose -f "$COMPOSE_FILE" exec -T web python manage.py migrate

log "Collecting static files"
docker compose -f "$COMPOSE_FILE" exec -T web python manage.py collectstatic --noinput

log "Removing unused Docker images"
docker image prune -f

log "Deployment completed successfully"

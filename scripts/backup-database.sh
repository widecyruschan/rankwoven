#!/usr/bin/env bash
set -euo pipefail

DATABASE_BACKUP_DIR="${DATABASE_BACKUP_DIR:-backups/database}"
DATABASE_SERVICE="${DATABASE_SERVICE:-postgres}"
DATABASE_URL="${DATABASE_URL:-}"
BACKUP_TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
BACKUP_FILE="${DATABASE_BACKUP_DIR}/rankwoven-${BACKUP_TIMESTAMP}.dump"

mkdir -p "$DATABASE_BACKUP_DIR"

if [[ -n "$DATABASE_URL" ]]; then
  pg_dump "$DATABASE_URL" --format=custom --file="$BACKUP_FILE"
else
  docker compose exec -T "$DATABASE_SERVICE" pg_dump -U "${POSTGRES_USER:-aieo}" -d "${POSTGRES_DB:-aieo}" --format=custom > "$BACKUP_FILE"
fi

echo "Created database backup: $BACKUP_FILE"

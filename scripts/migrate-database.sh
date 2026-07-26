#!/usr/bin/env bash
set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-db/migrations}"
DATABASE_SERVICE="${DATABASE_SERVICE:-postgres}"
DATABASE_URL="${DATABASE_URL:-}"

run_psql() {
  local sql="$1"

  if [[ -n "$DATABASE_URL" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At -c "$sql"
    return
  fi

  docker compose exec -T "$DATABASE_SERVICE" psql -U "${POSTGRES_USER:-aieo}" -d "${POSTGRES_DB:-aieo}" -v ON_ERROR_STOP=1 -At -c "$sql"
}

run_psql_file() {
  local file="$1"

  if [[ -n "$DATABASE_URL" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
    return
  fi

  docker compose exec -T "$DATABASE_SERVICE" psql -U "${POSTGRES_USER:-aieo}" -d "${POSTGRES_DB:-aieo}" -v ON_ERROR_STOP=1 < "$file"
}

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migration directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

run_psql "CREATE TABLE IF NOT EXISTS schema_migrations (version varchar(120) PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());" >/dev/null

shopt -s nullglob
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
  version="$(basename "$migration_file")"
  applied_count="$(run_psql "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';")"

  if [[ "$applied_count" == "1" ]]; then
    echo "Skipping already applied migration: $version"
    continue
  fi

  echo "Applying migration: $version"
  run_psql_file "$migration_file" >/dev/null
  run_psql "INSERT INTO schema_migrations (version) VALUES ('$version') ON CONFLICT (version) DO NOTHING;" >/dev/null
done

echo "Database migrations completed."

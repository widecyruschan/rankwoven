#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local max_attempts="${3:-30}"
  local sleep_seconds="${4:-5}"

  for attempt in $(seq 1 "$max_attempts"); do
    local status
    status="$(curl -fsS -o /dev/null -w '%{http_code}' "$url" || true)"
    if [[ "$status" == "200" ]]; then
      echo "${label} check passed: ${url}"
      return 0
    fi

    echo "${label} check waiting (${attempt}/${max_attempts}), status=${status:-curl_failed}"
    sleep "$sleep_seconds"
  done

  echo "${label} check failed: ${url}" >&2
  exit 1
}

build_login_payload() {
  python3 -c 'import json, os; print(json.dumps({"email": os.environ["DEPLOY_SMOKE_EMAIL"], "password": os.environ["DEPLOY_SMOKE_PASSWORD"]}))'
}

extract_auth_token() {
  python3 -c 'import json, sys; print(json.load(sys.stdin)["data"]["token"])'
}

wait_for_authenticated_url() {
  local url="$1"
  local label="$2"
  local max_attempts="${3:-30}"
  local sleep_seconds="${4:-5}"

  for attempt in $(seq 1 "$max_attempts"); do
    local login_body
    local token
    local status

    login_body="$(curl -fsS \
      -H 'Content-Type: application/json' \
      -d "$(build_login_payload)" \
      "$DEPLOY_SMOKE_LOGIN_URL" || true)"
    token="$(printf '%s' "$login_body" | extract_auth_token 2>/dev/null || true)"

    if [[ -n "$token" ]]; then
      status="$(curl -fsS \
        -H "Authorization: Bearer $token" \
        -o /dev/null \
        -w '%{http_code}' \
        "$url" || true)"
    else
      status="login_failed"
    fi

    if [[ "$status" == "200" ]]; then
      echo "${label} authenticated check passed: ${url}"
      return 0
    fi

    echo "${label} authenticated check waiting (${attempt}/${max_attempts}), status=${status:-curl_failed}"
    sleep "$sleep_seconds"
  done

  echo "${label} authenticated check failed: ${url}" >&2
  exit 1
}

require_env "DEPLOY_HOST"

DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/docker/rankwoven}"
DEPLOY_BACKUP_DIR="${DEPLOY_BACKUP_DIR:-/docker/backups}"
DEPLOY_DATABASE_BACKUP_DIR="${DEPLOY_DATABASE_BACKUP_DIR:-$DEPLOY_BACKUP_DIR/database}"
DEPLOY_PROFILE="${DEPLOY_PROFILE:-data}"
DEPLOY_REF="${DEPLOY_REF:-HEAD}"
DEPLOY_HEALTH_URL="${DEPLOY_HEALTH_URL:-https://api.rankwoven.com/health}"
DEPLOY_SMOKE_URL="${DEPLOY_SMOKE_URL:-https://api.rankwoven.com/api/v1/site-connections}"
DEPLOY_SMOKE_LOGIN_URL="${DEPLOY_SMOKE_LOGIN_URL:-https://api.rankwoven.com/api/v1/auth/login}"
DEPLOY_SMOKE_EMAIL="${DEPLOY_SMOKE_EMAIL:-demo@rankwoven.com}"
DEPLOY_SMOKE_PASSWORD="${DEPLOY_SMOKE_PASSWORD:-rankwoven}"
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
DEPLOY_COMMIT="$(git rev-parse "$DEPLOY_REF")"

echo "Deploying RankWoven ${DEPLOY_COMMIT} to ${REMOTE}:${DEPLOY_PATH}"

ssh "$REMOTE" "set -euo pipefail
mkdir -p '$DEPLOY_BACKUP_DIR'
if [[ -d '$DEPLOY_PATH' ]]; then
  backup_path='$DEPLOY_BACKUP_DIR/rankwoven-config-'\$(date +%Y%m%d%H%M%S)'.tgz'
  files=()
  for file in .env docker-compose.yml Dockerfile .env.example .build.log .deploy-version; do
    if [[ -e '$DEPLOY_PATH/'\"\$file\" ]]; then
      files+=(\"\$file\")
    fi
  done
  if [[ \${#files[@]} -gt 0 ]]; then
    tar -czf \"\$backup_path\" -C '$DEPLOY_PATH' \"\${files[@]}\"
    echo \"Created config backup: \$backup_path\"
  fi
fi"

git archive --format=tar "$DEPLOY_REF" | ssh "$REMOTE" "set -euo pipefail
new_dir='${DEPLOY_PATH}-new'
old_dir='${DEPLOY_PATH}-old-'\$(date +%Y%m%d%H%M%S)
if [[ -e \"\$new_dir\" ]]; then
  mv \"\$new_dir\" \"\$new_dir-abandoned-\"\$(date +%Y%m%d%H%M%S)
fi
mkdir -p \"\$new_dir\"
tar -xf - -C \"\$new_dir\"
if [[ -f '$DEPLOY_PATH/.env' ]]; then
  cp '$DEPLOY_PATH/.env' \"\$new_dir/.env\"
fi
printf 'commit=%s\ndeployed_at=%s\n' '$DEPLOY_COMMIT' \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" > \"\$new_dir/.deploy-version\"
if [[ -d '$DEPLOY_PATH' ]]; then
  mv '$DEPLOY_PATH' \"\$old_dir\"
  echo \"Archived previous release: \$old_dir\"
fi
mv \"\$new_dir\" '$DEPLOY_PATH'
echo \"Activated release: $DEPLOY_PATH\""

ssh "$REMOTE" "set -euo pipefail
cd '$DEPLOY_PATH'
COMPOSE_FILES='-f docker-compose.yml -f docker-compose.prod.yml'
docker compose \$COMPOSE_FILES --profile '$DEPLOY_PROFILE' up -d postgres
for attempt in \$(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U \"\${POSTGRES_USER:-aieo}\" -d \"\${POSTGRES_DB:-aieo}\" >/dev/null 2>&1; then
    echo \"PostgreSQL is ready\"
    break
  fi
  if [[ \"\$attempt\" == \"30\" ]]; then
    echo \"PostgreSQL did not become ready\" >&2
    exit 1
  fi
  sleep 2
done
DATABASE_BACKUP_DIR='$DEPLOY_DATABASE_BACKUP_DIR' bash scripts/backup-database.sh
bash scripts/migrate-database.sh
# Tear down the existing Compose project before rebuilding. This avoids stale network
# endpoints / port bindings (e.g. 8080) that can remain during an in-place recreate.
# Named volumes (postgres_data, redis_data) are preserved.
docker compose \$COMPOSE_FILES down --remove-orphans || true
docker compose \$COMPOSE_FILES --profile '$DEPLOY_PROFILE' up -d --build
docker compose \$COMPOSE_FILES --profile '$DEPLOY_PROFILE' ps"

wait_for_url "$DEPLOY_HEALTH_URL" "Health"
wait_for_authenticated_url "$DEPLOY_SMOKE_URL" "Smoke"

echo "Deployment completed: ${DEPLOY_COMMIT}"

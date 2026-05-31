#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${RAILWAY_URL:-}}"
AUTH_USER="${ADMIN_USER:-}"
AUTH_PASSWORD="${ADMIN_PASSWORD:-}"

if [ -z "$BASE_URL" ]; then
  echo "Usage: scripts/validate/smoke-railway.sh https://your-app.up.railway.app"
  echo "Or set RAILWAY_URL"
  exit 1
fi

BASE_URL="${BASE_URL%/}"
AUTH_ARGS=()
if [ -n "$AUTH_USER" ] && [ -n "$AUTH_PASSWORD" ]; then
  AUTH_ARGS=(-u "$AUTH_USER:$AUTH_PASSWORD")
fi

check() {
  local label="$1"
  local path="$2"
  echo "Checking ${label}: ${path}"
  curl -fsS "${AUTH_ARGS[@]}" "$BASE_URL$path" >/tmp/klinge-smoke-response.json
  head -c 300 /tmp/klinge-smoke-response.json || true
  echo
}

check "health" "/health"
check "db status" "/api/admin/db/status"
check "db counts" "/api/admin/db/counts"
check "ventas API" "/api/data/ventas?limit=3"
check "clientes API" "/api/data/clientes?limit=3"
check "Supabase REST compat" "/rest/v1/ventas?select=*&limit=3"
check "frontend" "/"

echo "Smoke test finished"

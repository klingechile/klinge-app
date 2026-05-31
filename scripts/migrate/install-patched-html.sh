#!/usr/bin/env bash
set -euo pipefail

SOURCE_FILE="${1:-}"
TARGET_FILE="public/index.html"

if [ -z "$SOURCE_FILE" ]; then
  echo "Usage: scripts/migrate/install-patched-html.sh /path/to/public_index_railway_patched.html"
  exit 1
fi

if [ ! -f "$SOURCE_FILE" ]; then
  echo "Source file not found: $SOURCE_FILE"
  exit 1
fi

mkdir -p public
cp "$SOURCE_FILE" "$TARGET_FILE"

check_absent() {
  local label="$1"
  local pattern="$2"
  if grep -q "$pattern" "$TARGET_FILE"; then
    echo "Security check failed: found ${label}"
    exit 1
  fi
}

check_present() {
  local label="$1"
  local pattern="$2"
  if ! grep -q "$pattern" "$TARGET_FILE"; then
    echo "Validation failed: missing ${label}"
    exit 1
  fi
}

check_absent "Supabase direct host" "supabase.co"
check_absent "Lumi admin key" "klinge_admin_2024"
check_absent "Anthropic direct API" "api.anthropic.com"
check_absent "DTE direct API" "generar-dte-production.up.railway.app/api/facturas"
check_absent "Lumi direct admin message endpoint" "lumi-klinge-bot-production.up.railway.app/admin/mensaje"

check_present "Railway data API" "/api/data/"
check_present "Railway Lumi API" "/api/lumi/message"
check_present "Railway DTE API" "/api/dte/facturas"
check_present "Railway AI API" "/api/ai/messages"

echo "Installed migrated frontend at ${TARGET_FILE}"
echo "Next: git add public/index.html && git commit -m 'feat: add migrated Netlify frontend' && git push"

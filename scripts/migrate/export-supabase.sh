#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SUPABASE_DATABASE_URL:-}" ]; then
  echo "Missing SUPABASE_DATABASE_URL"
  exit 1
fi

mkdir -p backups
STAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="backups/klinge_supabase_${STAMP}.dump"
SQL_FILE="backups/klinge_supabase_${STAMP}.sql"

echo "Creating custom dump: ${DUMP_FILE}"
pg_dump "$SUPABASE_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$DUMP_FILE"

echo "Creating SQL backup: ${SQL_FILE}"
pg_dump "$SUPABASE_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --file="$SQL_FILE"

echo "Done"
echo "$DUMP_FILE"
echo "$SQL_FILE"

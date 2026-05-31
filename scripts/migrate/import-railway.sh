#!/usr/bin/env bash
set -euo pipefail

TARGET_DATABASE_URL="${RAILWAY_DATABASE_URL:-${DATABASE_PUBLIC_URL:-${DATABASE_URL:-}}}"

if [ -z "$TARGET_DATABASE_URL" ]; then
  echo "Missing target database URL. Set RAILWAY_DATABASE_URL, DATABASE_PUBLIC_URL or DATABASE_URL."
  exit 1
fi

DUMP_FILE="${1:-}"
if [ -z "$DUMP_FILE" ]; then
  echo "Usage: scripts/migrate/import-railway.sh backups/klinge_supabase_YYYYMMDD_HHMMSS.dump"
  exit 1
fi

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump file not found: $DUMP_FILE"
  exit 1
fi

echo "Restoring ${DUMP_FILE} into Railway PostgreSQL"
pg_restore \
  --dbname="$TARGET_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  "$DUMP_FILE"

echo "Validating core counts"
psql "$TARGET_DATABASE_URL" -f scripts/sql/validate-core-counts.sql

echo "Restore done"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
SCHEMA_FILE="$ROOT_DIR/db/schema.sql"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env file at $ENV_FILE"
  exit 1
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "Missing schema file at $SCHEMA_FILE"
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set in $ENV_FILE"
  exit 1
fi

# psql does not accept Prisma-style query params like ?schema=public.
PSQL_DATABASE_URL="${DATABASE_URL%%\?*}"

DB_NAME="$(printf '%s\n' "$PSQL_DATABASE_URL" | sed -E 's|^[^:]+://[^/]+/([^?]+).*$|\1|')"

if [[ -z "$DB_NAME" || "$DB_NAME" == "$DATABASE_URL" ]]; then
  echo "Unable to parse database name from DATABASE_URL"
  exit 1
fi

echo "Checking database '$DB_NAME'..."
if sudo -u postgres bash -lc "cd /tmp && psql -d postgres -tAc \"SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'\"" | grep -q 1; then
  echo "Database '$DB_NAME' already exists."
else
  echo "Creating database '$DB_NAME' with sudo..."
  sudo -u postgres bash -lc "cd /tmp && createdb \"$DB_NAME\""
fi

echo "Applying schema from $SCHEMA_FILE..."
psql "$PSQL_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"

echo "Done."

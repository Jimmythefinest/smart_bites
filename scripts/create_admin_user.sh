#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Default connection/app values. Environment variables still override these.
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:strong_password@localhost:5432/smart_bites?schema=public}"
PORT="${PORT:-3000}"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_NAME="${ADMIN_NAME:-App Admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin-pass-123}"

if [[ "${#ADMIN_PASSWORD}" -lt 8 ]]; then
  echo "ADMIN_PASSWORD must be at least 8 characters."
  exit 1
fi

PSQL_DATABASE_URL="$DATABASE_URL"
if [[ "$DATABASE_URL" == *\?* ]]; then
  base="${DATABASE_URL%%\?*}"
  query="${DATABASE_URL#*\?}"
  schema=""
  filtered=()

  IFS='&' read -ra parts <<< "$query"
  for part in "${parts[@]}"; do
    [[ -z "$part" ]] && continue
    key="${part%%=*}"
    value="${part#*=}"
    if [[ "$key" == "schema" ]]; then
      schema="$value"
    else
      filtered+=("$part")
    fi
  done

  PSQL_DATABASE_URL="$base"
  if [[ "${#filtered[@]}" -gt 0 ]]; then
    PSQL_DATABASE_URL="${base}?$(IFS='&'; echo "${filtered[*]}")"
  fi

  if [[ -n "$schema" ]]; then
    if [[ -n "${PGOPTIONS:-}" ]]; then
      export PGOPTIONS="${PGOPTIONS} -c search_path=${schema}"
    else
      export PGOPTIONS="-c search_path=${schema}"
    fi
  fi
fi

ADMIN_HASH="$(node -e 'const { hashPassword } = require("./src/lib/auth"); process.stdout.write(hashPassword(process.argv[1]));' "$ADMIN_PASSWORD")"

psql "$PSQL_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v admin_email="$ADMIN_EMAIL" \
  -v admin_name="$ADMIN_NAME" \
  -v admin_hash="$ADMIN_HASH" <<'SQL'
insert into users (email, full_name, password_hash, role, managed_restaurant_id)
values (:'admin_email', :'admin_name', :'admin_hash', 'admin', null)
on conflict (email) do update
set full_name = excluded.full_name,
    password_hash = excluded.password_hash,
    role = excluded.role,
    managed_restaurant_id = null
returning id, email, role, created_at;
SQL

echo "Admin user upsert complete."

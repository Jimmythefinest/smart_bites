#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/curl_tests/lib.sh"

ADMIN_EMAIL="api-admin@example.com"
ADMIN_PASSWORD="admin-pass-123"
BUYER_EMAIL="api-buyer@example.com"
BUYER_PASSWORD="buyer-pass-123"

ADMIN_HASH="$(password_hash "$ADMIN_PASSWORD")"
BUYER_HASH="$(password_hash "$BUYER_PASSWORD")"

db_scalar "insert into users (email, full_name, password_hash, role, managed_restaurant_id)
values ('${ADMIN_EMAIL}', 'API Admin', '${ADMIN_HASH}', 'admin', null)
on conflict (email) do update set
  full_name = excluded.full_name,
  password_hash = excluded.password_hash,
  role = excluded.role,
  managed_restaurant_id = null;"

db_scalar "insert into users (email, full_name, password_hash, role, managed_restaurant_id)
values ('${BUYER_EMAIL}', 'API Buyer', '${BUYER_HASH}', 'buyer', null)
on conflict (email) do update set
  full_name = excluded.full_name,
  password_hash = excluded.password_hash,
  role = excluded.role,
  managed_restaurant_id = null;"

http_json "POST" "$BASE_URL/api/auth/login" "200" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
ADMIN_TOKEN="$(json_get token)"
ADMIN_ID="$(json_get user.id)"
state_export ADMIN_TOKEN "$ADMIN_TOKEN"
state_export ADMIN_ID "$ADMIN_ID"
state_export ADMIN_EMAIL "$ADMIN_EMAIL"

http_json "POST" "$BASE_URL/api/auth/login" "200" "{\"email\":\"$BUYER_EMAIL\",\"password\":\"$BUYER_PASSWORD\"}"
BUYER_TOKEN="$(json_get token)"
BUYER_ID="$(json_get user.id)"
state_export BUYER_TOKEN "$BUYER_TOKEN"
state_export BUYER_ID "$BUYER_ID"
state_export BUYER_EMAIL "$BUYER_EMAIL"

http_json "GET" "$BASE_URL/api/auth/me" "200" "" "$BUYER_TOKEN"
assert_eq "$BUYER_ID" "$(json_get user.id)" "buyer /auth/me id"

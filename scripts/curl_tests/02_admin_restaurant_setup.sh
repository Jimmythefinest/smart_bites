#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/curl_tests/lib.sh"

: "${ADMIN_TOKEN:?ADMIN_TOKEN missing. Run login test first.}"

STAMP="$(date +%s)"
SLUG="curl-seed-restaurant-$STAMP"
OWNER_EMAIL="owner-$STAMP@example.com"
OWNER_PASSWORD="owner-pass-123"

http_json "POST" "$BASE_URL/api/restaurants" "201" "{\"name\":\"Curl Seed Restaurant $STAMP\",\"slug\":\"$SLUG\",\"is_active\":true,\"owner_full_name\":\"Curl Owner\",\"owner_email\":\"$OWNER_EMAIL\",\"owner_password\":\"$OWNER_PASSWORD\"}" "$ADMIN_TOKEN"

RESTAURANT_ID="$(json_get restaurant.id)"
state_export RESTAURANT_ID "$RESTAURANT_ID"
state_export RESTAURANT_OWNER_EMAIL "$OWNER_EMAIL"
state_export RESTAURANT_OWNER_PASSWORD "$OWNER_PASSWORD"

http_json "POST" "$BASE_URL/api/auth/login" "200" "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\"}"
RESTAURANT_TOKEN="$(json_get token)"
MANAGED_ID="$(json_get user.managed_restaurant_id)"
assert_eq "$RESTAURANT_ID" "$MANAGED_ID" "restaurant owner managed_restaurant_id"
state_export RESTAURANT_TOKEN "$RESTAURANT_TOKEN"

LOCATION_ID="$(db_scalar "insert into restaurant_locations (restaurant_id, name, address_line1, city, state, postal_code, timezone, is_active)
values ($RESTAURANT_ID, 'Main Branch', '100 API St', 'Austin', 'TX', '78701', 'America/Chicago', true)
returning id;")"
state_export LOCATION_ID "$LOCATION_ID"

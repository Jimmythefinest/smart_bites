#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
TMP_BODY="$(mktemp)"
trap 'rm -f "$TMP_BODY"' EXIT

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env file at $ENV_FILE"
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL not set in .env"
  exit 1
fi

PSQL_DATABASE_URL="${DATABASE_URL%%\?*}"

http_json() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local expected="$4"
  local status

  if [[ -n "$data" ]]; then
    status="$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -X "$method" "$url" -H "content-type: application/json" -d "$data")"
  else
    status="$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -X "$method" "$url")"
  fi

  if [[ "$status" != "$expected" ]]; then
    echo "FAILED $method $url expected=$expected got=$status"
    cat "$TMP_BODY"
    echo
    exit 1
  fi

  echo "PASS $method $url ($status)"
  cat "$TMP_BODY"
  echo
}

echo "Preparing seed records with psql..."
USER_ID="$(
  psql "$PSQL_DATABASE_URL" -Atqc \
  "insert into users (email, full_name) values ('api-curl-user@example.com', 'API Curl User') on conflict (email) do update set full_name = excluded.full_name returning id;"
)"
RESTAURANT_ID="$(
  psql "$PSQL_DATABASE_URL" -Atqc \
  "insert into restaurants (name, slug, is_active) values ('Curl Seed Restaurant', 'curl-seed-restaurant', true) on conflict (slug) do update set name = excluded.name returning id;"
)"
LOCATION_ID="$(
  psql "$PSQL_DATABASE_URL" -Atqc \
  "insert into restaurant_locations (restaurant_id, name, address_line1, city, state, postal_code, timezone, is_active)
   values ($RESTAURANT_ID, 'Main Branch', '100 API St', 'Austin', 'TX', '78701', 'America/Chicago', true)
   returning id;"
)"

echo "Running curl endpoint checks against $BASE_URL ..."
http_json "GET" "$BASE_URL/api/health" "" "200"
http_json "GET" "$BASE_URL/api/restaurants" "" "200"
http_json "POST" "$BASE_URL/api/restaurants" '{"name":"Shell Sushi","slug":"shell-sushi","is_active":true}' "201"

http_json "POST" "$BASE_URL/api/restaurants/$RESTAURANT_ID/menu-items" '{"name":"Shell Burger","base_price_cents":1299}' "201"
MENU_ITEM_ID="$(
  psql "$PSQL_DATABASE_URL" -Atqc \
  "select id from menu_items where restaurant_id = $RESTAURANT_ID and name = 'Shell Burger' order by id desc limit 1;"
)"

http_json "GET" "$BASE_URL/api/restaurants/$RESTAURANT_ID/menu-items" "" "200"
http_json "PUT" "$BASE_URL/api/locations/$LOCATION_ID/menu-items/$MENU_ITEM_ID/inventory" '{"qty_on_hand":30,"reorder_level":8}' "200"
http_json "GET" "$BASE_URL/api/locations/$LOCATION_ID/inventory" "" "200"
http_json "POST" "$BASE_URL/api/locations/$LOCATION_ID/menu-items/$MENU_ITEM_ID/inventory/transactions" '{"txn_type":"sale","qty_delta":-2,"reason":"curl test sale"}' "201"
http_json "POST" "$BASE_URL/api/orders" "{\"customer_id\":$USER_ID,\"restaurant_id\":$RESTAURANT_ID,\"location_id\":$LOCATION_ID,\"order_type\":\"pickup\",\"tax_cents\":100,\"items\":[{\"menu_item_id\":$MENU_ITEM_ID,\"quantity\":1}]}" "201"

ORDER_ID="$(
  psql "$PSQL_DATABASE_URL" -Atqc \
  "select id from orders where customer_id = $USER_ID and restaurant_id = $RESTAURANT_ID order by id desc limit 1;"
)"
http_json "GET" "$BASE_URL/api/orders/$ORDER_ID" "" "200"

echo "All curl tests passed."

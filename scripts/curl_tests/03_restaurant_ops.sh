#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/curl_tests/lib.sh"

: "${RESTAURANT_ID:?RESTAURANT_ID missing}"
: "${RESTAURANT_TOKEN:?RESTAURANT_TOKEN missing}"
: "${LOCATION_ID:?LOCATION_ID missing}"

http_json "POST" "$BASE_URL/api/restaurants/$RESTAURANT_ID/menu-items" "201" '{"name":"Shell Burger","base_price_cents":1299}' "$RESTAURANT_TOKEN"
MENU_ITEM_ID="$(json_get id)"
state_export MENU_ITEM_ID "$MENU_ITEM_ID"

http_json "GET" "$BASE_URL/api/restaurants/$RESTAURANT_ID/menu-items" "200" "" "$RESTAURANT_TOKEN"
http_json "PUT" "$BASE_URL/api/locations/$LOCATION_ID/menu-items/$MENU_ITEM_ID/inventory" "200" '{"qty_on_hand":30,"reorder_level":8}' "$RESTAURANT_TOKEN"
http_json "GET" "$BASE_URL/api/locations/$LOCATION_ID/inventory" "200" "" "$RESTAURANT_TOKEN"
http_json "POST" "$BASE_URL/api/locations/$LOCATION_ID/menu-items/$MENU_ITEM_ID/inventory/transactions" "201" '{"txn_type":"sale","qty_delta":-2,"reason":"curl test sale"}' "$RESTAURANT_TOKEN"

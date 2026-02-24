#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/curl_tests/lib.sh"

: "${BUYER_ID:?BUYER_ID missing}"
: "${BUYER_TOKEN:?BUYER_TOKEN missing}"
: "${RESTAURANT_ID:?RESTAURANT_ID missing}"
: "${RESTAURANT_TOKEN:?RESTAURANT_TOKEN missing}"
: "${LOCATION_ID:?LOCATION_ID missing}"
: "${MENU_ITEM_ID:?MENU_ITEM_ID missing}"

http_json "POST" "$BASE_URL/api/orders" "201" "{\"customer_id\":$BUYER_ID,\"restaurant_id\":$RESTAURANT_ID,\"location_id\":$LOCATION_ID,\"order_type\":\"pickup\",\"tax_cents\":100,\"items\":[{\"menu_item_id\":$MENU_ITEM_ID,\"quantity\":1}]}" "$BUYER_TOKEN"
ORDER_ID="$(json_get id)"
state_export ORDER_ID "$ORDER_ID"

http_json "GET" "$BASE_URL/api/orders/$ORDER_ID" "200" "" "$BUYER_TOKEN"
assert_eq "$ORDER_ID" "$(json_get id)" "buyer get order id"

http_json "GET" "$BASE_URL/api/restaurants/$RESTAURANT_ID/orders" "200" "" "$RESTAURANT_TOKEN"
http_json "PATCH" "$BASE_URL/api/orders/$ORDER_ID/status" "200" '{"status":"preparation"}' "$RESTAURANT_TOKEN"
assert_eq "preparing" "$(json_get status)" "order moved to preparing"

http_json "PATCH" "$BASE_URL/api/orders/$ORDER_ID/status" "200" '{"status":"done"}' "$RESTAURANT_TOKEN"
assert_eq "completed" "$(json_get status)" "order moved to completed"

http_json "GET" "$BASE_URL/api/customers/$BUYER_ID/orders" "200" "" "$BUYER_TOKEN"
assert_eq "completed" "$(json_get 0.status)" "buyer sees completed order"

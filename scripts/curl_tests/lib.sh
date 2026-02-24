#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:?BASE_URL is required}"
: "${STATE_FILE:?STATE_FILE is required}"
: "${PSQL_DATABASE_URL:?PSQL_DATABASE_URL is required}"

TMP_BODY="$(mktemp)"
cleanup_tmp_body() {
  rm -f "$TMP_BODY"
}
trap cleanup_tmp_body EXIT

if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
fi

http_json() {
  local method="$1"
  local url="$2"
  local expected="$3"
  local data="${4:-}"
  local token="${5:-}"
  local status
  local -a headers

  headers=(-H "content-type: application/json")
  if [[ -n "$token" ]]; then
    headers+=(-H "authorization: Bearer $token")
  fi

  if [[ -n "$data" ]]; then
    status="$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -X "$method" "$url" "${headers[@]}" -d "$data")"
  else
    status="$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -X "$method" "$url" "${headers[@]}")"
  fi

  if [[ "$status" != "$expected" ]]; then
    echo "FAILED $method $url expected=$expected got=$status"
    cat "$TMP_BODY"
    echo
    return 1
  fi

  echo "PASS $method $url ($status)"
  cat "$TMP_BODY"
  echo
}

json_get() {
  local path="$1"
  node -e '
const fs = require("fs");
const path = process.argv[1];
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const value = path.split(".").reduce((acc, key) => {
  if (acc === null || acc === undefined) return undefined;
  if (/^\d+$/.test(key)) return acc[Number(key)];
  return acc[key];
}, data);
if (value === undefined || value === null) {
  process.exit(2);
}
if (typeof value === "object") {
  process.stdout.write(JSON.stringify(value));
} else {
  process.stdout.write(String(value));
}
' "$path" "$TMP_BODY"
}

assert_eq() {
  local expected="$1"
  local actual="$2"
  local message="$3"
  if [[ "$expected" != "$actual" ]]; then
    echo "ASSERT FAILED: $message expected=$expected got=$actual"
    return 1
  fi
  echo "PASS ASSERT: $message"
}

state_export() {
  local key="$1"
  local value="$2"
  printf "%s=%q\n" "$key" "$value" >> "$STATE_FILE"
  export "$key=$value"
}

db_scalar() {
  local sql="$1"
  psql "$PSQL_DATABASE_URL" -Atqc "$sql"
}

password_hash() {
  local password="$1"
  node -e 'const { hashPassword } = require("./src/lib/auth"); process.stdout.write(hashPassword(process.argv[1]));' "$password"
}

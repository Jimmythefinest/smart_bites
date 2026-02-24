#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
TEST_DIR="$ROOT_DIR/scripts/curl_tests"
STATE_FILE="$(mktemp)"
trap 'rm -f "$STATE_FILE"' EXIT

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env file at $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL not set in .env"
  exit 1
fi

PSQL_DATABASE_URL="${DATABASE_URL%%\?*}"

mapfile -t TEST_FILES < <(find "$TEST_DIR" -maxdepth 1 -type f -name '[0-9][0-9]_*.sh' | sort)
if [[ ${#TEST_FILES[@]} -eq 0 ]]; then
  echo "No test files found in $TEST_DIR"
  exit 1
fi

pass_count=0
fail_count=0
failed_tests=()

echo "Running curl suite against $BASE_URL"
echo

for test_file in "${TEST_FILES[@]}"; do
  test_name="$(basename "$test_file")"
  echo "=== RUN $test_name ==="
  if BASE_URL="$BASE_URL" PSQL_DATABASE_URL="$PSQL_DATABASE_URL" STATE_FILE="$STATE_FILE" bash "$test_file"; then
    echo "=== PASS $test_name ==="
    pass_count=$((pass_count + 1))
  else
    echo "=== FAIL $test_name ==="
    fail_count=$((fail_count + 1))
    failed_tests+=("$test_name")
  fi
  echo

done

echo "Summary: passed=$pass_count failed=$fail_count total=${#TEST_FILES[@]}"
if (( fail_count > 0 )); then
  echo "Failed tests:"
  for failed in "${failed_tests[@]}"; do
    echo "- $failed"
  done
  exit 1
fi

echo "All curl tests passed."

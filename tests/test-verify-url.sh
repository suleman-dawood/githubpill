#!/usr/bin/env bash
# test-verify-url.sh — unit tests for scripts/verify-url.sh (mocked curl).
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SCRIPT="$ROOT/skills/githubpill/scripts/verify-url.sh"
export PATH="$HERE/lib/mock-bin:$PATH"

_log() { printf '%s\n' "$*" >&2; }
PASS=0; FAIL=0
check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS+1)); _log "  PASS $desc"
  else
    FAIL=$((FAIL+1)); _log "  FAIL $desc (expected: $expected, got: $actual)"
  fi
}
check_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if printf '%s' "$haystack" | grep -qF -- "$needle"; then
    PASS=$((PASS+1)); _log "  PASS $desc"
  else
    FAIL=$((FAIL+1)); _log "  FAIL $desc (missing: $needle)"
  fi
}

_log "=== test-verify-url ==="

# 200 OK -> JSON with checked_at timestamp.
export MOCK_CURL_CODE=200 MOCK_CURL_URL='https://saas.example.com'
OUT=$(bash "$SCRIPT" 'https://saas.example.com'); RC=$?
check "200 exit" 0 "$RC"
check_contains "200 json" '"http_code":"200"' "$OUT"
check_contains "checked_at present" '"checked_at"' "$OUT"

# Redirect followed into 2xx/3xx band -> success.
export MOCK_CURL_CODE=301
OUT=$(bash "$SCRIPT" 'https://saas.example.com' >/dev/null); RC=$?
check "301 exit" 0 "$RC"

# 404 -> exit 20 (drop the candidate).
export MOCK_CURL_CODE=404
OUT=$(bash "$SCRIPT" 'https://gone.example.com' 2>/dev/null); RC=$?
check "404 exit" 20 "$RC"

# 500 -> exit 21.
export MOCK_CURL_CODE=500
OUT=$(bash "$SCRIPT" 'https://broken.example.com' 2>/dev/null); RC=$?
check "500 exit" 21 "$RC"

# Transport failure -> exit 22.
export MOCK_CURL_FAIL=7
OUT=$(bash "$SCRIPT" 'https://unreachable.example.com' 2>/dev/null); RC=$?
check "transport fail exit" 22 "$RC"
unset MOCK_CURL_FAIL

# Non-http(s) scheme -> exit 23.
OUT=$(bash "$SCRIPT" 'ftp://example.com' 2>/dev/null); RC=$?
check "invalid scheme exit" 23 "$RC"

_log "Ran $((PASS+FAIL)) assertions, $FAIL failed."
[ "$FAIL" -eq 0 ]

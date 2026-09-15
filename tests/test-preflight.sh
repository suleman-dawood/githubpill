#!/usr/bin/env bash
# test-preflight.sh — unit tests for scripts/preflight.sh (mocked gh).
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SCRIPT="$ROOT/skills/githubpill/scripts/preflight.sh"
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

_log "=== test-preflight ==="

# Rate budget happy path.
export MOCK_GH_FIXTURE='{"resources":{"core":{"remaining":4999},"search":{"remaining":29}}}'
OUT=$(bash "$SCRIPT"); RC=$?
check "happy path exit" 0 "$RC"
check "happy path json" '{"core_remaining":4999,"search_remaining":29}' "$OUT"

# gh not authenticated -> exit 2.
BASH_BIN="$(command -v bash)"
OUT=$(PATH="/nonexistent" "$BASH_BIN" "$SCRIPT" 2>/dev/null); RC=$?
check "missing gh exit" 2 "$RC"

# Malformed rate_limit JSON -> exit 2.
export MOCK_GH_FIXTURE='{"oops":true}'
OUT=$(bash "$SCRIPT" 2>/dev/null); RC=$?
check "malformed json exit" 2 "$RC"

_log "Ran $((PASS+FAIL)) assertions, $FAIL failed."
[ "$FAIL" -eq 0 ]

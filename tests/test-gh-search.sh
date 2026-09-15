#!/usr/bin/env bash
# test-gh-search.sh — unit tests for scripts/gh-search.sh (mocked gh).
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SCRIPT="$ROOT/skills/githubpill/scripts/gh-search.sh"
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

_log "=== test-gh-search ==="

ITEMS='[{"full_name":"a/b","description":"d","stars":1,"pushed_at":"2026-01-01","archived":false,"language":"Go","url":"https://github.com/a/b"}]'

# Happy path: keyword query gets the in:name,description,readme qualifier.
export MOCK_GH_FIXTURE="$ITEMS" MOCK_GH_ARGS_LOG="$(mktemp)"
OUT=$(bash "$SCRIPT" "todo cli"); RC=$?
check "keyword query exit" 0 "$RC"
check "keyword query output" "$ITEMS" "$OUT"
check_contains "qualifier added" "in:name,description,readme" "$(cat "$MOCK_GH_ARGS_LOG")"
rm -f "$MOCK_GH_ARGS_LOG"

# Topic query passes through untouched.
export MOCK_GH_FIXTURE="$ITEMS" MOCK_GH_ARGS_LOG="$(mktemp)"
OUT=$(bash "$SCRIPT" "topic:todo topic:cli"); RC=$?
check "topic query exit" 0 "$RC"
check_contains "topic passthrough" "-F q=topic:todo topic:cli" "$(cat "$MOCK_GH_ARGS_LOG")"
rm -f "$MOCK_GH_ARGS_LOG"

# Secondary rate limit on both attempts -> exit 78.
export MOCK_GH_FAIL=secondary
OUT=$(bash "$SCRIPT" "todo cli" 2>/dev/null); RC=$?
check "rate-limit exhausted exit" 78 "$RC"
unset MOCK_GH_FAIL

# Secondary rate limit on first attempt only -> retry succeeds.
COUNTER=$(mktemp); rm -f "$COUNTER"
export MOCK_GH_FAIL_FIRST_N=1 MOCK_GH_COUNTER_FILE="$COUNTER" MOCK_GH_FIXTURE="$ITEMS"
OUT=$(bash "$SCRIPT" "todo cli"); RC=$?
check "retry after backoff exit" 0 "$RC"
check "retry after backoff output" "$ITEMS" "$OUT"
unset MOCK_GH_FAIL_FIRST_N MOCK_GH_COUNTER_FILE

# Non-rate-limit error -> exit 1.
export MOCK_GH_FAIL=404
OUT=$(bash "$SCRIPT" "todo cli" 2>/dev/null); RC=$?
check "query error exit" 1 "$RC"
unset MOCK_GH_FAIL

_log "Ran $((PASS+FAIL)) assertions, $FAIL failed."
[ "$FAIL" -eq 0 ]

#!/usr/bin/env bash
# test-verify-repo.sh — unit tests for scripts/verify-repo.sh (mocked gh).
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SCRIPT="$ROOT/skills/githubpill/scripts/verify-repo.sh"
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

_log "=== test-verify-repo ==="

META='{"full_name":"a/b","stars":10,"pushed_at":"2026-01-01","archived":false,"default_branch":"main","language":"Go","url":"https://github.com/a/b"}'

# Happy path: enriched with verified_at and contributor_count.
export MOCK_GH_FIXTURE="$META"
OUT=$(bash "$SCRIPT" "a/b"); RC=$?
check "happy path exit" 0 "$RC"
check_contains "verified_at present" '"verified_at"' "$OUT"
check_contains "contributor_count present" '"contributor_count"' "$OUT"

# 404 -> exit 1 (the citation gate drops the candidate).
export MOCK_GH_FAIL=404
OUT=$(bash "$SCRIPT" "gone/repo" 2>/dev/null); RC=$?
check "404 exit" 1 "$RC"
unset MOCK_GH_FAIL

# Rate limit on both attempts -> exit 78.
export MOCK_GH_FAIL=secondary
OUT=$(bash "$SCRIPT" "a/b" 2>/dev/null); RC=$?
check "rate-limit exhausted exit" 78 "$RC"
unset MOCK_GH_FAIL

_log "Ran $((PASS+FAIL)) assertions, $FAIL failed."
[ "$FAIL" -eq 0 ]

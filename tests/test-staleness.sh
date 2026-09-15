#!/usr/bin/env bash
# test-staleness.sh — unit tests for scripts/staleness.sh.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SCRIPT="$ROOT/skills/githubpill/scripts/staleness.sh"

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

_log "=== test-staleness ==="

NOW_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Active, multi-contributor, recently pushed -> no tags.
FRESH="{\"archived\":false,\"pushed_at\":\"$NOW_UTC\",\"contributor_count\":7}"
check "fresh repo" "" "$(bash "$SCRIPT" "$FRESH")"

# Archived -> archived tag.
ARCHIVED="{\"archived\":true,\"pushed_at\":\"$NOW_UTC\",\"contributor_count\":7}"
check "archived repo" "archived" "$(bash "$SCRIPT" "$ARCHIVED")"

# Pushed 400 days ago -> stale-12mo.
OLD_DATE=$(date -u -d "400 days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-400d +%Y-%m-%dT%H:%M:%SZ)
STALE="{\"archived\":false,\"pushed_at\":\"$OLD_DATE\",\"contributor_count\":7}"
check "stale-12mo repo" "stale-12mo" "$(bash "$SCRIPT" "$STALE")"

# Solo project, dormant 200 days -> solo-stale-6mo.
SOLO_DATE=$(date -u -d "200 days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-200d +%Y-%m-%dT%H:%M:%SZ)
SOLO="{\"archived\":false,\"pushed_at\":\"$SOLO_DATE\",\"contributor_count\":1}"
check "solo-stale repo" "solo-stale-6mo" "$(bash "$SCRIPT" "$SOLO")"

# Archived + stale + solo -> all three tags.
ALL_DATE=$(date -u -d "500 days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-500d +%Y-%m-%dT%H:%M:%SZ)
ALL="{\"archived\":true,\"pushed_at\":\"$ALL_DATE\",\"contributor_count\":1}"
check "all tags" "archived stale-12mo solo-stale-6mo" "$(bash "$SCRIPT" "$ALL")"

_log "Ran $((PASS+FAIL)) assertions, $FAIL failed."
[ "$FAIL" -eq 0 ]

#!/usr/bin/env bash
# test-safe-clone.sh — unit tests for scripts/safe-clone.sh (mocked gh + git).
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SCRIPT="$ROOT/skills/githubpill/scripts/safe-clone.sh"
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

_log "=== test-safe-clone ==="

TMPROOT=$(mktemp -d)
export GITHUBPILL_TMP="$TMPROOT/githubpill"
export MOCK_GIT_PROFILE=normal_repo
trap 'rm -rf "$TMPROOT"' EXIT

# Happy path: small repo clones, dest printed under the run root.
export MOCK_GH_FIXTURE='100'
DEST=$(bash "$SCRIPT" "octocat/Hello-World"); RC=$?
check "happy path exit" 0 "$RC"
case "$DEST" in
  "$GITHUBPILL_TMP"/clone-*) check "dest under run root" yes yes ;;
  *) check "dest under run root" yes "no ($DEST)" ;;
esac
[ -f "$DEST/README.md" ] && check "clone has README" yes yes || check "clone has README" yes no

# Oversize repo -> exit 11, no clone attempted.
export MOCK_GH_FIXTURE='99999'
OUT=$(bash "$SCRIPT" "torvalds/linux" 2>&1); RC=$?
check "oversize exit" 11 "$RC"
case "$OUT" in
  *"skip oversize"*) check "oversize reason" yes yes ;;
  *) check "oversize reason" yes "no" ;;
esac
CLONES=$(find "$GITHUBPILL_TMP" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
check "no clone dir leaked" 1 "$CLONES"

# Cap override via GITHUBPILL_MAX_SIZE_KB.
export MOCK_GH_FIXTURE='80000' GITHUBPILL_MAX_SIZE_KB=100000
DEST=$(bash "$SCRIPT" "big/repo"); RC=$?
check "cap override exit" 0 "$RC"
unset GITHUBPILL_MAX_SIZE_KB

# Clone failure -> exit 13, partial dir cleaned.
export MOCK_GH_FIXTURE='100' MOCK_GIT_PROFILE=nonexistent_profile
OUT=$(bash "$SCRIPT" "broken/repo" 2>&1); RC=$?
check "clone error exit" 13 "$RC"
CLONES=$(find "$GITHUBPILL_TMP" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
check "error path cleaned" 2 "$CLONES"

_log "Ran $((PASS+FAIL)) assertions, $FAIL failed."
[ "$FAIL" -eq 0 ]

#!/usr/bin/env bash
# test-vapor-check.sh — unit tests for scripts/vapor-check.sh.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SCRIPT="$ROOT/skills/githubpill/scripts/vapor-check.sh"

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

_log "=== test-vapor-check ==="

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
NOW_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)
FRESH_META="{\"archived\":false,\"pushed_at\":\"$NOW_UTC\"}"

# Planted vapor fixture: heavy README claims, one stub source file -> vapor.
OUT=$(bash "$SCRIPT" "$ROOT/tests/fixtures/planted-vapor-repo" "$FRESH_META"); RC=$?
check "planted vapor exit" 0 "$RC"
check_contains "planted vapor json" '"vapor":true' "$OUT"

# Normal repo: real source files back the claims -> not vapor.
mkdir -p "$WORK/normal"
printf '# real\n\n## One\n## Two\n## Three\n' > "$WORK/normal/README.md"
for i in 1 2 3 4 5 6 7 8; do printf 'x=1\n' > "$WORK/normal/mod$i.py"; done
OUT=$(bash "$SCRIPT" "$WORK/normal" "$FRESH_META"); RC=$?
check "normal repo exit" 1 "$RC"
check_contains "normal repo json" '"vapor":false' "$OUT"

# Claim-heavy README but archived repo -> vapor.
mkdir -p "$WORK/old"
printf '# old\n\n## One\n## Two\n## Three\n' > "$WORK/old/README.md"
for i in 1 2 3 4 5 6 7 8; do printf 'x=1\n' > "$WORK/old/mod$i.py"; done
ARCHIVED_META='{"archived":true,"pushed_at":"2020-01-01T00:00:00Z"}'
OUT=$(bash "$SCRIPT" "$WORK/old" "$ARCHIVED_META"); RC=$?
check "archived vapor exit" 0 "$RC"
check_contains "archived vapor json" '"vapor":true' "$OUT"

_log "Ran $((PASS+FAIL)) assertions, $FAIL failed."
[ "$FAIL" -eq 0 ]

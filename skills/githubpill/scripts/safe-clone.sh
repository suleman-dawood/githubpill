#!/usr/bin/env bash
# safe-clone.sh — the only sanctioned way to fetch a candidate repo.
# Guards: size pre-check via gh api (GITHUBPILL_MAX_SIZE_KB, default 50MB),
# partial clone (--depth 1 --filter=blob:none --single-branch --no-tags),
# LFS skip, and a 60s timeout. Prints the clone's path on stdout.
# Exit 0 on success, 11 oversize, 12 timeout, 13 clone error.
set -euo pipefail

OWNER_REPO="${1:?usage: safe-clone.sh <owner/repo>}"
MAX_KB="${GITHUBPILL_MAX_SIZE_KB:-50000}"
ROOT="${GITHUBPILL_TMP:-/tmp/githubpill}"
mkdir -p "$ROOT"

SIZE_KB=$(gh api "repos/$OWNER_REPO" --jq '.size' 2>/dev/null || echo 0)
if [ "${SIZE_KB:-0}" -gt "$MAX_KB" ] 2>/dev/null; then
  echo "skip oversize: $OWNER_REPO is ${SIZE_KB}KB (> ${MAX_KB}KB cap)" >&2
  exit 11
fi

DEST=$(mktemp -d "$ROOT/clone-XXXXXX")

set +e
GIT_LFS_SKIP_SMUDGE=1 timeout 60 git clone \
  --depth 1 --filter=blob:none --single-branch --no-tags \
  "https://github.com/$OWNER_REPO" "$DEST" >/dev/null 2>&1
RC=$?
set -e

if [ "$RC" -eq 0 ]; then
  printf '%s\n' "$DEST"
  exit 0
fi

rm -rf "$DEST"
if [ "$RC" -eq 124 ]; then
  echo "skip timeout: $OWNER_REPO" >&2
  exit 12
fi
echo "skip clone error: $OWNER_REPO (rc=$RC)" >&2
exit 13

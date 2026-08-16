#!/usr/bin/env bash
# safe-clone-guard.sh — harness-agnostic clone-safety contract for GithubPill.
#
# Same contract as the Claude Code PreToolUse hook (hooks/safe-clone-guard.sh),
# expressed as a plain script so pi can enforce it from a bash spawn-hook
# extension (pi/extensions/githubpill-safe-clone-guard.ts) without duplicating
# the safety logic in TypeScript. Keep the regexes and flags in sync with
# hooks/safe-clone-guard.sh — tests/test-pi-safe-clone-guard.sh guards this
# side, tests/test-safe-clone-guard.sh guards the Claude side.
#
# Usage:  safe-clone-guard.sh "<command>"
#
# Prints exactly one line on stdout:
#   PASS                    — not a `git clone`; run the command unchanged
#   REWRITE:<new command>   — `git clone`; run this instead
#   DENY:<reason>           — `git clone` blocked (repo over size cap)
#
# Exit code 0 unless the guard itself malfunctions. Reads the size cap from
# GITHUBPILL_MAX_SIZE_KB (default 50000 KB).

set -euo pipefail

CMD="${1:-}"
GITHUBPILL_MAX_SIZE_KB="${GITHUBPILL_MAX_SIZE_KB:-50000}"

# Only intercept `git clone` (with possible leading env vars / flags); allow everything else.
if ! printf '%s' "$CMD" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+clone([[:space:]]|$)'; then
  printf 'PASS\n'
  exit 0
fi

# Extract a GitHub repo URL if present.
REPO_URL=$(printf '%s' "$CMD" | grep -oE 'https?://github\.com/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+(\.git)?|git@github\.com:[A-Za-z0-9._-]+/[A-Za-z0-9._-]+(\.git)?' | head -1 || true)

# Size pre-check: only for github.com URLs
if [ -n "${REPO_URL:-}" ] && printf '%s' "$REPO_URL" | grep -q 'github.com'; then
  OWNER_REPO=$(printf '%s' "$REPO_URL" | sed -E 's|^https?://github\.com/||; s|^git@github\.com:||; s|\.git$||')
  SIZE_KB=$(gh api "repos/$OWNER_REPO" --jq '.size' 2>/dev/null || echo 0)
  if [ "${SIZE_KB:-0}" -gt "$GITHUBPILL_MAX_SIZE_KB" ] 2>/dev/null; then
    printf 'DENY:repo %s is %sKB (>%sKB cap). GithubPill refuses to clone large repos; use remote-inspection or raise GITHUBPILL_MAX_SIZE_KB.\n' \
      "$OWNER_REPO" "$SIZE_KB" "$GITHUBPILL_MAX_SIZE_KB"
    exit 0
  fi
fi

# Rewrite the command to enforce safety flags.
NEW_CMD=$(printf '%s' "$CMD" | sed -E 's#(^|[;&|[:space:]])git[[:space:]]+clone[[:space:]]+#\1GIT_LFS_SKIP_SMUDGE=1 timeout 60 git clone --depth 1 --filter=blob:none --single-branch --no-tags #')

printf 'REWRITE:%s\n' "$NEW_CMD"
exit 0

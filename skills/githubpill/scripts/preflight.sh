#!/usr/bin/env bash
# preflight.sh — verify gh authentication and snapshot the API rate budget.
# Prints {"core_remaining":N,"search_remaining":N} on stdout. Exit 2 if unusable.
set -euo pipefail

gh auth status >/dev/null 2>&1 || {
  echo "ERROR: gh not authenticated. Run: gh auth login" >&2
  exit 2
}

RATE=$(gh api rate_limit 2>&1) || {
  echo "ERROR: gh api rate_limit failed: $RATE" >&2
  exit 2
}

CORE=$(printf '%s' "$RATE" | jq -er '.resources.core.remaining' 2>/dev/null) || {
  echo "ERROR: malformed rate_limit JSON" >&2
  exit 2
}
SEARCH=$(printf '%s' "$RATE" | jq -er '.resources.search.remaining' 2>/dev/null) || {
  echo "ERROR: malformed rate_limit JSON" >&2
  exit 2
}

printf '{"core_remaining":%d,"search_remaining":%d}\n' "$CORE" "$SEARCH"

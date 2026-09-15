#!/usr/bin/env bash
# verify-repo.sh — confirm a GitHub repo exists (200 OK) and print enriched
# metadata JSON, including the verification timestamp and contributor count.
# This is the citation-integrity gate: no repo appears in output without it.
# Exit 0 on success, 1 on 404 or API error, 78 when the rate limit is exhausted.
set -euo pipefail

OWNER_REPO="${1:?usage: verify-repo.sh <owner/repo>}"

for attempt in 1 2; do
  if OUT=$(gh api "repos/$OWNER_REPO" \
      --jq '{full_name, stars: .stargazers_count, pushed_at, archived, default_branch, language, url: .html_url}' 2>&1); then
    VERIFIED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    CONTRIB=$(gh api "repos/$OWNER_REPO/contributors" --jq 'length' 2>/dev/null || echo 0)
    printf '%s\n' "$OUT" | jq --arg vat "$VERIFIED_AT" --argjson c "$CONTRIB" \
      '. + {verified_at: $vat, contributor_count: $c}'
    exit 0
  fi
  if printf '%s' "$OUT" | grep -qiE 'secondary rate limit|rate limit|HTTP 429'; then
    if [ "$attempt" -eq 1 ]; then sleep 5; fi
    continue
  fi
  echo "$OUT" >&2
  exit 1
done

exit 78

#!/usr/bin/env bash
# gh-search.sh — run one GitHub repo-search query, print a JSON items array.
# Topic queries pass through untouched; keyword queries search name,
# description, and readme. Retries once on secondary rate limit.
# Exit 0 on success, 1 on query error, 78 when the rate limit is exhausted.
set -euo pipefail

QUERY="${1:?usage: gh-search.sh <query>}"

case "$QUERY" in
  topic:*) PARAM="$QUERY" ;;
  *)       PARAM="$QUERY in:name,description,readme" ;;
esac

for attempt in 1 2; do
  if OUT=$(gh api -X GET search/repositories -F q="$PARAM" -F per_page=30 \
      --jq '[.items[] | {full_name, description, stars: .stargazers_count, pushed_at, archived, language, url: .html_url}]' 2>&1); then
    printf '%s\n' "$OUT"
    exit 0
  fi
  if printf '%s' "$OUT" | grep -qiE 'secondary rate limit|rate limit|HTTP 429'; then
    if [ "$attempt" -eq 1 ]; then sleep 5; fi
    continue
  fi
  echo "$OUT" >&2
  exit 1
done

echo "ERROR: gh search rate-limit exhausted for query: $QUERY" >&2
exit 78

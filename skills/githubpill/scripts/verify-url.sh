#!/usr/bin/env bash
# verify-url.sh — liveness-check a non-GitHub URL (SaaS landing pages, YC
# profiles). Prints {url, final_url, http_code, checked_at} JSON on success.
# Exit 20 on 4xx, 21 on 5xx, 22 on transport failure, 23 on invalid URL.
set -euo pipefail

URL="${1:?usage: verify-url.sh <url>}"

case "$URL" in
  http://*|https://*) ;;
  *) echo "invalid url: $URL" >&2; exit 23 ;;
esac

RESP=$(curl -sS -L --max-time 10 --max-redirs 5 -o /dev/null \
  -w '%{http_code}|%{url_effective}' "$URL" 2>/dev/null) || {
  echo "curl failed: $URL" >&2
  exit 22
}
CODE="${RESP%%|*}"
FINAL="${RESP#*|}"

if [ "$CODE" -ge 200 ] && [ "$CODE" -lt 400 ]; then
  jq -nc --arg url "$URL" --arg final "$FINAL" --arg code "$CODE" \
    --arg checked "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{url: $url, final_url: $final, http_code: $code, checked_at: $checked}'
  exit 0
fi

case "$CODE" in
  4*) exit 20 ;;
  5*) exit 21 ;;
  *)  exit 22 ;;
esac

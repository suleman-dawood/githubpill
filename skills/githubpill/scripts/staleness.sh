#!/usr/bin/env bash
# staleness.sh — derive staleness tags from verified repo metadata JSON.
# Prints space-separated tags on stdout (empty line if the repo is fresh).
# Tags never change a verdict; they annotate the report.
set -euo pipefail

META="${1:?usage: staleness.sh <metadata-json>}"

ARCHIVED=$(printf '%s' "$META" | jq -r '.archived')
PUSHED=$(printf '%s' "$META" | jq -r '.pushed_at')
CONTRIB=$(printf '%s' "$META" | jq -r '.contributor_count // 0')

NOW=$(date +%s)
PUSHED_EPOCH=$(date -d "$PUSHED" +%s 2>/dev/null || echo "$NOW")
AGE_DAYS=$(( (NOW - PUSHED_EPOCH) / 86400 ))

TAGS=""
if [ "$ARCHIVED" = "true" ]; then TAGS="archived"; fi
if [ "$AGE_DAYS" -gt 365 ]; then TAGS="${TAGS:+$TAGS }stale-12mo"; fi
if [ "$CONTRIB" -le 1 ] && [ "$AGE_DAYS" -gt 180 ]; then
  TAGS="${TAGS:+$TAGS }solo-stale-6mo"
fi
printf '%s\n' "$TAGS"

#!/usr/bin/env bash
# vapor-check.sh — detect "README claims but no source" repos.
# Prints {"claims":N,"source_files":N,"vapor":bool} on stdout.
# Exit 0 when the repo is vapor, 1 when it is not. The vapor decision is
# mechanical by design; the judge LLM never makes it.
set -euo pipefail

DIR="${1:?usage: vapor-check.sh <clone-dir> <metadata-json>}"
META="${2:?usage: vapor-check.sh <clone-dir> <metadata-json>}"

CLAIMS=0
if [ -f "$DIR/README.md" ]; then
  CLAIMS=$(grep -cE '^## ' "$DIR/README.md" || true)
fi
SOURCE_FILES=$(find "$DIR" -type f \( \
    -name '*.py' -o -name '*.ts' -o -name '*.js' -o -name '*.go' \
    -o -name '*.rs' -o -name '*.rb' -o -name '*.java' \
    -o -name '*.c' -o -name '*.cpp' -o -name '*.sh' \) 2>/dev/null | wc -l)

ARCHIVED=$(printf '%s' "$META" | jq -r '.archived')
PUSHED=$(printf '%s' "$META" | jq -r '.pushed_at')
NOW=$(date +%s)
PUSHED_EPOCH=$(date -d "$PUSHED" +%s 2>/dev/null || echo "$NOW")
AGE_DAYS=$(( (NOW - PUSHED_EPOCH) / 86400 ))

STALE=false
if [ "$AGE_DAYS" -gt 547 ]; then STALE=true; fi

VAPOR=false
if [ "$CLAIMS" -ge 3 ]; then
  if [ "$SOURCE_FILES" -le 5 ] || [ "$ARCHIVED" = "true" ] || [ "$STALE" = "true" ]; then
    VAPOR=true
  fi
fi

printf '{"claims":%d,"source_files":%d,"vapor":%s}\n' "$CLAIMS" "$SOURCE_FILES" "$VAPOR"
if [ "$VAPOR" = "true" ]; then exit 0; fi
exit 1

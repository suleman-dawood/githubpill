#!/usr/bin/env bash
# tests/run-goldens-pi.sh — goldens runner for the pi port of GithubPill.
#
# pi analog of run-goldens.sh. For each tests/golden/*.json fixture:
#   For run in 1..3:
#     - Invoke the githubpill skill through the pi CLI with the fixture's `idea`.
#     - Parse the verdict band (🟢 / 🟡 / 🔴) from the emitted report H1.
#     - Record wall-clock seconds (T1-09 budget = 90s).
#   Assert: all 3 runs produced the same band   (stability)
#   Assert: band == fixture.expected_verdict_band
#   Assert: every wall_clock <= 90
#
# Invocation: the skill is triggered by description matching (no skill-command
# settings dependency), so headless runs use a natural-language prompt.
#
# Requires real gh quota + an LLM provider, so it is NOT part of default CI.
# Run locally:  bash tests/run-goldens-pi.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/tests/golden"
REPORT_DIR="$REPO_ROOT/githubpill-reports"
RESULTS_DIR="$REPO_ROOT/tests/.goldens-results-pi"
T1_BUDGET_SECONDS=90
RUNS_PER_FIXTURE=3

mkdir -p "$RESULTS_DIR"

# ---------- preflight: deps ----------
need() {
  local bin="$1"
  command -v "$bin" >/dev/null 2>&1 || { echo "MISSING_DEP: $bin" >&2; return 1; }
}
need gh || exit 2
need jq || exit 2
need pi || exit 2

echo "## Dependency versions"
echo "gh:    $(gh --version | head -n1)"
echo "jq:    $(jq --version)"
echo "pi:    $(pi --version 2>/dev/null || echo unknown)"

# ---------- report parsing (same contract as run-goldens.sh) ----------
latest_report() {
  ls -1t "$REPORT_DIR"/*.md 2>/dev/null | head -n1
}

parse_band() {
  local report="$1"
  local h1
  h1="$(grep -m1 '^# ' "$report" || true)"
  for emoji in 🟢 🟡 🔴; do
    if [[ "$h1" == *"$emoji"* ]]; then echo "$emoji"; return 0; fi
  done
  echo "?"
}

# ---------- main loop ----------
shopt -s nullglob
fixtures=("$FIXTURE_DIR"/*.json)
if (( ${#fixtures[@]} == 0 )); then
  echo "No fixtures found in $FIXTURE_DIR" >&2
  exit 1
fi

OVERALL_PASS=1
declare -a SUMMARY_ROWS=()

for f in "${fixtures[@]}"; do
  fixture_name="$(basename "$f" .json)"
  # deep-* fixtures are stub-only; the pi goldens runner covers first search.
  case "$fixture_name" in
    deep-*) continue ;;
  esac
  scenario=$(jq -r '.scenario // ""' "$f")
  idea=$(jq -r '.idea' "$f")
  expected=$(jq -r '.expected_verdict_band' "$f")

  echo ""
  echo "## Scenario: $scenario — $fixture_name"
  echo "   expected band: $expected"

  bands=()
  for run in $(seq 1 $RUNS_PER_FIXTURE); do
    start_ts=$(date -u +%s)
    if ! pi -p "GithubPill: validate this project idea before I build it: $idea" \
      >"/tmp/githubpill-pi-goldens-$fixture_name-$run.log" 2>&1; then
      echo "  run $run: pi invocation FAILED (see /tmp/githubpill-pi-goldens-$fixture_name-$run.log)" >&2
      OVERALL_PASS=0
      bands+=("?")
      continue
    fi
    end_ts=$(date -u +%s)
    wall_clock=$((end_ts - start_ts))

    report="$(latest_report)"
    if [[ -z "$report" ]]; then
      echo "  run $run: no report emitted under $REPORT_DIR" >&2
      OVERALL_PASS=0
      bands+=("?")
      continue
    fi
    band="$(parse_band "$report")"
    bands+=("$band")
    echo "  run $run: band=$band  wall_clock=${wall_clock}s  report=$(basename "$report")"

    if (( wall_clock > T1_BUDGET_SECONDS )); then
      echo "  FAIL[T1-09 budget]: ${wall_clock}s > ${T1_BUDGET_SECONDS}s on $fixture_name run $run" >&2
      OVERALL_PASS=0
    fi
  done

  first="${bands[0]}"
  stable=1
  for b in "${bands[@]}"; do
    if [[ "$b" != "$first" ]]; then stable=0; break; fi
  done
  if (( stable == 0 )); then
    echo "  FAIL[stability]: bands across 3 runs = ${bands[*]}" >&2
    OVERALL_PASS=0
  fi
  if [[ "$first" != "$expected" ]]; then
    echo "  FAIL[band-mismatch]: got '$first', expected '$expected'" >&2
    OVERALL_PASS=0
  fi
  SUMMARY_ROWS+=("$fixture_name | ${bands[0]} ${bands[1]} ${bands[2]} | expected=$expected | stable=$stable")
done

echo ""
echo "=== Goldens summary (pi) ==="
for row in "${SUMMARY_ROWS[@]}"; do echo "  $row"; done

# ---------- stub-mode gates that apply to pi too ----------
echo ""
echo "===== pi stub-mode gates ====="
STUB_FAIL=0

# Sanitization pipeline (same sed pipeline the skill uses on cloned content).
INJECTION_FIXTURE="$REPO_ROOT/tests/fixtures/planted-injection-readme.md"
if [ -f "$INJECTION_FIXTURE" ]; then
  SAN_OUT=$(sed -e 's/<!--.*-->//g' \
                -e $'s/\xE2\x80\x8B//g' -e $'s/\xE2\x80\x8C//g' \
                -e $'s/\xE2\x80\x8D//g' -e $'s/\xEF\xBB\xBF//g' \
                "$INJECTION_FIXTURE")
  if printf '%s' "$SAN_OUT" | LC_ALL=C grep -q $'\xE2\x80\x8B'; then
    echo "FAIL: sanitization left zero-width chars in output"
    STUB_FAIL=$((STUB_FAIL + 1))
  else
    echo "PASS: zero-width chars stripped"
  fi
  if printf '%s' "$SAN_OUT" | grep -q "<!--"; then
    echo "FAIL: sanitization left HTML comment in output"
    STUB_FAIL=$((STUB_FAIL + 1))
  else
    echo "PASS: HTML comments stripped"
  fi
else
  echo "SKIP: planted-injection-readme.md missing"
fi

echo ""
if (( OVERALL_PASS == 1 )) && (( STUB_FAIL == 0 )); then
  echo "RESULT: PASS (stability + band-correctness + T1-09 90s budget + stub gates)"
  exit 0
else
  echo "RESULT: FAIL (OVERALL_PASS=$OVERALL_PASS, stub failures=$STUB_FAIL)" >&2
  exit 1
fi

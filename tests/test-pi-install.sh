#!/usr/bin/env bash
# test-pi-install.sh — structural validation of the pi port tree.
#
# Verifies that the pi port is complete and self-consistent:
#  - every pi file exists and is executable where required
#  - the canonical skill has no host-specific leakage ($CLAUDE_PLUGIN_ROOT)
#  - the skill frontmatter and reference wiring are intact
#  - install.sh / uninstall.sh are executable and symmetric
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
# shellcheck source=lib/assert.sh
source "$HERE/lib/assert.sh"

_log "=== test-pi-install ==="

# ---------- 1. pi tree structure ----------
for f in \
  "pi/extensions/githubpill-subagent/index.ts" \
  "pi/agents/githubpill-judge.md" \
  "pi/install.sh" \
  "pi/uninstall.sh" \
  "pi/README.md"; do
  assert_file_exists "$ROOT/$f" "$f exists"
done

# Executables (any executable permission, not an exact mode)
for f in "pi/install.sh" "pi/uninstall.sh"; do
  if [ -x "$ROOT/$f" ]; then
    _log "  PASS $f executable"
  else
    _log "  FAIL $f not executable"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_CASES+=("$f not executable")
  fi
done

# Shebangs + strict mode
for f in "pi/install.sh" "pi/uninstall.sh"; do
  FIRST=$(head -n1 "$ROOT/$f")
  assert_eq "#!/usr/bin/env bash" "$FIRST" "$f shebang"
  if grep -qE '^set -euo pipefail' "$ROOT/$f"; then
    _log "  PASS $f set -euo pipefail"
  else
    _log "  FAIL $f missing 'set -euo pipefail'"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
done

# ---------- 2. extension wiring ----------
SUB_TS="$ROOT/pi/extensions/githubpill-subagent/index.ts"
if grep -q 'name: "subagent"' "$SUB_TS" && grep -q "githubpill-judge\|parseFrontmatter" "$SUB_TS"; then
  _log "  PASS subagent extension registers subagent tool with agent discovery"
else
  _log "  FAIL subagent extension missing tool registration"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# ---------- 3. judge agent frontmatter ----------
JUDGE="$ROOT/pi/agents/githubpill-judge.md"
FM=$(awk '/^---$/{f++; next} f==1{print} f==2{exit}' "$JUDGE")
for key in "name" "description" "tools"; do
  if printf '%s\n' "$FM" | grep -qE "^${key}:"; then
    _log "  PASS githubpill-judge.md frontmatter has key: $key"
  else
    _log "  FAIL githubpill-judge.md frontmatter missing key: $key"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
done
if printf '%s\n' "$FM" | grep -q "githubpill-judge"; then
  _log "  PASS judge agent name is githubpill-judge"
else
  _log "  FAIL judge agent name mismatch"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  FAILED_CASES+=("judge agent name mismatch")
fi

# ---------- 4. skill tree is host-neutral ----------
if grep -rn "CLAUDE_PLUGIN_ROOT" "$ROOT/skills/githubpill" >/dev/null 2>&1; then
  _log "  FAIL \$CLAUDE_PLUGIN_ROOT leaked into canonical skill"
  TESTS_FAILED=$((TESTS_FAILED + 1))
else
  _log "  PASS no \$CLAUDE_PLUGIN_ROOT in skills/githubpill"
fi

# The canonical skill must stay host-neutral: it names the capability
# (subagent tool, web-search tool) rather than one host's tool identifier.
if grep -qi "subagent" "$ROOT/skills/githubpill/SKILL.md"; then
  _log "  PASS SKILL.md names the subagent tool (deep-search dispatch)"
else
  _log "  FAIL SKILL.md missing subagent tool reference"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi
if grep -qi "web-search tool" "$ROOT/skills/githubpill/SKILL.md"; then
  _log "  PASS SKILL.md names the web-search tool generically"
else
  _log "  FAIL SKILL.md missing generic web-search tool reference"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# ---------- 5. SKILL.md references each references/*.md ----------
SKILL_FILE="$ROOT/skills/githubpill/SKILL.md"
for rm in first-search.md deep-search.md query-patterns.md judge-rubric.md report-template.md web-cross-check.md; do
  if grep -q "$rm" "$SKILL_FILE"; then
    _log "  PASS SKILL.md references reference doc: $rm"
  else
    _log "  FAIL SKILL.md does not reference reference doc: $rm"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
done

# ---------- 6. install/uninstall symmetry ----------
INSTALL="$ROOT/pi/install.sh"
UNINSTALL="$ROOT/pi/uninstall.sh"
for needle in "agent/skills/githubpill" "githubpill-subagent" "githubpill-judge.md"; do
  if grep -qF "$needle" "$INSTALL" && grep -qF "$needle" "$UNINSTALL"; then
    _log "  PASS install/uninstall both handle: $needle"
  else
    _log "  FAIL install/uninstall asymmetry on: $needle"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
done

test_summary

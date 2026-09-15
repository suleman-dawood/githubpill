#!/usr/bin/env bash
set -euo pipefail

# install-validation.sh
# Structural validation of the plugin/skill tree. Run from the repo root.
# Exits 0 if all checks pass; 1 otherwise.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

FAIL=0
fail() { echo "FAIL: $*" >&2; FAIL=1; }
ok()   { echo "ok:   $*"; }

# ---------- 1. Required files ----------
REQUIRED_FILES=(
  ".claude-plugin/plugin.json"
  ".claude-plugin/marketplace.json"
  "package.json"
  "README.md"
  "AGENTS.md"
  "LICENSE"
  "install.sh"
  "skills/githubpill/SKILL.md"
  "skills/githubpill/references/first-search.md"
  "skills/githubpill/references/deep-search.md"
  "skills/githubpill/references/query-patterns.md"
  "skills/githubpill/references/judge-rubric.md"
  "skills/githubpill/references/report-template.md"
  "skills/githubpill/references/web-cross-check.md"
)

for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    ok "exists: $f"
  else
    fail "missing required file: $f"
  fi
done

# ---------- 2. Protocol scripts present and executable ----------
PROTOCOL_SCRIPTS=(
  preflight.sh gh-search.sh verify-repo.sh staleness.sh
  vapor-check.sh verify-url.sh safe-clone.sh
)
for s in "${PROTOCOL_SCRIPTS[@]}"; do
  path="skills/githubpill/scripts/$s"
  if [[ -x "$path" ]]; then
    ok "executable: $path"
  elif [[ -f "$path" ]]; then
    fail "not executable: $path"
  else
    fail "missing protocol script: $path"
  fi
done

# ---------- 3. Installer sanity ----------
if [[ -f install.sh ]]; then
  if [[ -x install.sh ]]; then ok "executable: install.sh"; else fail "not executable: install.sh"; fi
  if bash -n install.sh 2>/dev/null; then ok "syntax ok: install.sh"; else fail "syntax error: install.sh"; fi
  if bash install.sh --list >/dev/null 2>&1; then
    ok "install.sh --list runs"
  else
    fail "install.sh --list failed"
  fi
fi

# ---------- 4. JSON parse validation ----------
json_check() {
  local f="$1"
  if command -v jq >/dev/null 2>&1; then
    jq . "$f" >/dev/null 2>&1
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" >/dev/null 2>&1
  elif command -v node >/dev/null 2>&1; then
    node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$f" >/dev/null 2>&1
  else
    return 2
  fi
}

for jf in ".claude-plugin/plugin.json" ".claude-plugin/marketplace.json" "package.json"; do
  [[ -f "$jf" ]] || continue
  set +e
  json_check "$jf"
  rc=$?
  set -e
  if [[ "$rc" -eq 0 ]]; then
    ok "valid JSON: $jf"
  elif [[ "$rc" -eq 2 ]]; then
    fail "no JSON validator available (install jq, python3, or node)"
    break
  else
    fail "invalid JSON: $jf"
  fi
done

# ---------- 5. SKILL.md frontmatter ----------
SKILL_FILE="skills/githubpill/SKILL.md"
if [[ -f "$SKILL_FILE" ]]; then
  FM="$(awk '/^---$/{f++; next} f==1{print} f==2{exit}' "$SKILL_FILE")"
  for key in "name" "description"; do
    if printf '%s\n' "$FM" | grep -qE "^${key}:"; then
      ok "SKILL.md frontmatter has key: $key"
    else
      fail "SKILL.md frontmatter missing key: $key"
    fi
  done
  # name must match the directory name (Agent Skills requirement).
  NAME="$(printf '%s\n' "$FM" | sed -n 's/^name:[[:space:]]*//p' | head -1)"
  if [[ "$NAME" == "githubpill" ]]; then
    ok "SKILL.md name matches directory: $NAME"
  else
    fail "SKILL.md name '$NAME' does not match directory 'githubpill'"
  fi
fi

# ---------- 6. SKILL.md references each reference doc ----------
REFERENCE_MDS=(
  first-search.md deep-search.md query-patterns.md
  judge-rubric.md report-template.md web-cross-check.md
)
if [[ -f "$SKILL_FILE" ]]; then
  for rm in "${REFERENCE_MDS[@]}"; do
    if grep -q "$rm" "$SKILL_FILE"; then
      ok "SKILL.md references reference doc: $rm"
    else
      fail "SKILL.md does not reference reference doc: $rm"
    fi
  done
fi

# ---------- 7. No stale script paths in the skill ----------
if grep -rq 'CLAUDE_PLUGIN_ROOT/scripts\|PLUGIN_ROOT/scripts' skills/githubpill; then
  fail "stale \$CLAUDE_PLUGIN_ROOT/scripts reference in skills/githubpill"
else
  ok "no stale plugin-root script references"
fi

# ---------- Result ----------
if [[ "$FAIL" -ne 0 ]]; then
  echo ""
  echo "install-validation: FAILED" >&2
  exit 1
fi
echo ""
echo "install-validation: PASSED"
exit 0

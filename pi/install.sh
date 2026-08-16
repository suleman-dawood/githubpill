#!/usr/bin/env bash
# install.sh — installs the GithubPill pi port into ~/.pi via symlinks.
#
# Installs:
#   skills/githubpill/                       → ~/.pi/agent/skills/githubpill   (the skill)
#   pi/extensions/githubpill-safe-clone-guard.ts → ~/.pi/agent/extensions/    (clone-safety bash spawn hook)
#   pi/extensions/githubpill-subagent/       → ~/.pi/agent/extensions/        (subagent tool for deep-search judging)
#   pi/agents/githubpill-judge.md            → ~/.pi/agent/agents/            (deep-search judge agent)
#
# Symlinks (not copies) so the installed port tracks this repo checkout.
# Restart pi (or run /reload) after installing. Uninstall: bash pi/uninstall.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
PI_HOME="${PI_HOME:-$HOME/.pi}"
SKILLS_DIR="$PI_HOME/agent/skills"
EXT_DIR="$PI_HOME/agent/extensions"
AGENTS_DIR="$PI_HOME/agent/agents"

mkdir -p "$SKILLS_DIR" "$EXT_DIR" "$AGENTS_DIR"

link() {
  local target="$1" name="$2"
  ln -sfn "$target" "$name"
  echo "  linked $(basename "$name")"
}

echo "Installing GithubPill pi port (symlinks into $PI_HOME):"

link "$ROOT/skills/githubpill" "$SKILLS_DIR/githubpill"
link "$ROOT/pi/extensions/githubpill-safe-clone-guard.ts" "$EXT_DIR/githubpill-safe-clone-guard.ts"
link "$ROOT/pi/extensions/githubpill-subagent" "$EXT_DIR/githubpill-subagent"
link "$ROOT/pi/agents/githubpill-judge.md" "$AGENTS_DIR/githubpill-judge.md"

echo ""
echo "Done. Restart pi or run /reload to load the extensions."
echo "Then invoke the skill with:  /skill:githubpill <idea>"
echo "(or just describe an idea — 'is there already a tool that does X?')"
echo ""
echo "Prerequisites: gh >= 2.55 (gh auth login), jq >= 1.7, and a web-search"
echo "tool enabled in your session (pi: the websearch extension)."

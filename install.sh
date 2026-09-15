#!/usr/bin/env bash
# install.sh — install the GithubPill skill into every agentic CLI on this machine.
#
# The skill follows the Agent Skills standard, so the same directory works in
# any host that reads skills/<name>/SKILL.md. This script symlinks it into the
# locations each host discovers.
#
# Usage:
#   bash install.sh                 # detected CLIs, user-level scope
#   bash install.sh --project       # this repo's agent configs + .agents/skills
#   bash install.sh --all           # every known target, both scopes
#   bash install.sh --list          # print targets, install nothing
#   bash install.sh --copy          # copy instead of symlink
#   bash install.sh --target <dir>  # one explicit skills directory
#
# The skill wraps the githubpill CLI, so the host also needs the CLI installed
# (npm install -g githubpill) and an ANTHROPIC_API_KEY in its environment.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SRC="$ROOT/skills/githubpill"

SCOPE="detected"
MODE="link"
DRY_RUN=0
EXPLICIT_TARGET=""

while [ $# -gt 0 ]; do
  case "$1" in
    --project) SCOPE="project" ;;
    --global)  SCOPE="global" ;;
    --all)     SCOPE="all" ;;
    --list)    DRY_RUN=1 ;;
    --copy)    MODE="copy" ;;
    --target)  EXPLICIT_TARGET="${2:?--target needs a directory}"; shift ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

# User-level skills directories, keyed by the CLI that reads them.
GLOBAL_TARGETS=(
  "claude|$HOME/.claude/skills|Claude Code"
  "opencode|$HOME/.config/opencode/skills|opencode"
  "codex|$HOME/.agents/skills|Codex CLI (and other Agent Skills hosts)"
  "pi|$HOME/.pi/agent/skills|pi"
)

# Project-level skills directories.
PROJECT_TARGETS=(
  "claude|.claude/skills|Claude Code"
  "opencode|.opencode/skills|opencode"
  "codex|.agents/skills|Codex CLI (and other Agent Skills hosts)"
  "cursor|.cursor/skills|Cursor"
)

detected() { command -v "$1" >/dev/null 2>&1; }

install_one() {
  local dir="$1" label="$2"
  local dest="$dir/githubpill"

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "  would install → $dest  ($label)"
    return 0
  fi

  mkdir -p "$dir"
  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    echo "  skip $dest — exists and is not a symlink (remove it first)" >&2
    return 1
  fi
  rm -rf "$dest"
  if [ "$MODE" = "copy" ]; then
    cp -R "$SKILL_SRC" "$dest"
    echo "  copied  → $dest  ($label)"
  else
    ln -s "$SKILL_SRC" "$dest"
    echo "  linked  → $dest  ($label)"
  fi
}

if [ -n "$EXPLICIT_TARGET" ]; then
  install_one "$EXPLICIT_TARGET" "explicit target"
  echo ""
  echo "Done. Restart the host CLI so it discovers the skill."
  exit 0
fi

echo "GithubPill installer — source: $SKILL_SRC"
echo ""

installed=0

if [ "$SCOPE" = "project" ] || [ "$SCOPE" = "all" ]; then
  echo "Project scope:"
  for entry in "${PROJECT_TARGETS[@]}"; do
    IFS='|' read -r bin dir label <<<"$entry"
    # Always take the portable .agents path; otherwise only where the host
    # already has a project config directory.
    if [ "$SCOPE" = "all" ] || [ "$dir" = ".agents/skills" ] || [ -d "$(dirname "$dir")" ]; then
      install_one "$dir" "$label" && installed=$((installed + 1))
    fi
  done
  echo ""
fi

if [ "$SCOPE" = "global" ] || [ "$SCOPE" = "all" ] || [ "$SCOPE" = "detected" ]; then
  echo "User scope:"
  for entry in "${GLOBAL_TARGETS[@]}"; do
    IFS='|' read -r bin dir label <<<"$entry"
    if [ "$SCOPE" = "all" ] || detected "$bin" || [ -d "$(dirname "$dir")" ]; then
      install_one "$dir" "$label" && installed=$((installed + 1))
    fi
  done
  echo ""
fi

if [ "$DRY_RUN" -eq 0 ] && [ "$installed" -eq 0 ]; then
  echo "No agentic CLI detected. Install the skill manually with:" >&2
  echo "  bash install.sh --target <your-cli-skills-dir>" >&2
  exit 1
fi

if [ "$DRY_RUN" -eq 0 ]; then
  echo "Done. Restart the host CLI so it discovers the skill."
  echo "Invoke it by describing an idea, or via the host's skill command."
fi

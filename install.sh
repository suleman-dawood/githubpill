#!/usr/bin/env bash
#
# install.sh — install the GithubPill skill into agentic CLIs on this machine.
#
# The skill lives in skills/githubpill and follows the Agent Skills standard,
# so the same directory works in any host that reads skills/<name>/SKILL.md.
# This script links (or copies) it into each host's skills directory.
#
# The skill drives the githubpill CLI, so the host also needs the CLI:
#   npm install -g githubpill
# See skills/githubpill/SKILL.md for how the skill runs.

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SRC="$SCRIPT_DIR/skills/githubpill"
SKILL_NAME="githubpill"

# Each target is a "command|skills-dir|label" record:

GLOBAL_TARGETS=(
  "claude|$HOME/.claude/skills|Claude Code"
  "opencode|$HOME/.config/opencode/skills|opencode"
  "codex|$HOME/.agents/skills|Codex CLI (and other Agent Skills hosts)"
  "pi|$HOME/.pi/agent/skills|pi"
)

PROJECT_TARGETS=(
  "claude|.claude/skills|Claude Code"
  "opencode|.opencode/skills|opencode"
  "codex|.agents/skills|Codex CLI (and other Agent Skills hosts)"
  "cursor|.cursor/skills|Cursor"
)

# ---------------------------------------------------------------------------
# Options (set by parse_args)
# ---------------------------------------------------------------------------

SCOPE="detected"
MODE="link"
DRY_RUN=0
EXPLICIT_TARGET=""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

usage() {
  cat <<'EOF'
GithubPill skill installer.

Usage:
  bash install.sh                 # detected CLIs, user-level scope
  bash install.sh --project       # this repo's agent configs + .agents/skills
  bash install.sh --global        # user-level targets only
  bash install.sh --all           # every known target, both scopes
  bash install.sh --list          # print targets, install nothing
  bash install.sh --copy          # copy instead of symlink
  bash install.sh --target <dir>  # one explicit skills directory
  bash install.sh -h | --help     # show this help
EOF
}

log() {
  printf '%s\n' "$*"
}

warn() {
  printf '%s\n' "$*" >&2
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Install the skill into one skills directory. Returns 1 (without exiting the
# script) when the destination exists and is not a symlink.
install_skill() {
  local dir="$1"
  local label="$2"
  local dest="$dir/$SKILL_NAME"

  if [ "$DRY_RUN" -eq 1 ]; then
    log "  would install → $dest  ($label)"
    return 0
  fi

  mkdir -p "$dir"

  # Never clobber a real directory; only replace a symlink we manage.
  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    warn "  skip $dest — exists and is not a symlink (remove it first)"
    return 1
  fi

  rm -rf "$dest"

  if [ "$MODE" = "copy" ]; then
    cp -R "$SKILL_SRC" "$dest"
    log "  copied  → $dest  ($label)"
  else
    ln -s "$SKILL_SRC" "$dest"
    log "  linked  → $dest  ($label)"
  fi
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --project) SCOPE="project" ;;
      --global)  SCOPE="global" ;;
      --all)     SCOPE="all" ;;
      --list)    DRY_RUN=1 ;;
      --copy)    MODE="copy" ;;
      --target)
        EXPLICIT_TARGET="${2:-}"
        if [ -z "$EXPLICIT_TARGET" ]; then
          warn "error: --target needs a directory"
          exit 2
        fi
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        warn "error: unknown option: $1"
        usage >&2
        exit 2
        ;;
    esac
    shift
  done
}

# ---------------------------------------------------------------------------
# Target selection
# ---------------------------------------------------------------------------

INSTALLED=0

# Project targets: always include the portable .agents path; otherwise only
# where the host already has a project config directory in this repo.
install_project_targets() {
  local scope="$1"
  local entry command dir label

  for entry in "${PROJECT_TARGETS[@]}"; do
    IFS='|' read -r command dir label <<<"$entry"

    if [ "$scope" = "all" ] || [ "$dir" = ".agents/skills" ] || [ -d "$(dirname "$dir")" ]; then
      if install_skill "$dir" "$label"; then
        INSTALLED=$((INSTALLED + 1))
      fi
    fi
  done
}

# Global targets: install where the CLI is on PATH or its config dir exists.
install_global_targets() {
  local scope="$1"
  local entry command dir label

  for entry in "${GLOBAL_TARGETS[@]}"; do
    IFS='|' read -r command dir label <<<"$entry"

    if [ "$scope" = "all" ] || command_exists "$command" || [ -d "$(dirname "$dir")" ]; then
      if install_skill "$dir" "$label"; then
        INSTALLED=$((INSTALLED + 1))
      fi
    fi
  done
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  parse_args "$@"

  if [ -n "$EXPLICIT_TARGET" ]; then
    install_skill "$EXPLICIT_TARGET" "explicit target"
    log ""
    log "Done. Restart the host CLI so it discovers the skill."
    return 0
  fi

  log "GithubPill installer — source: $SKILL_SRC"
  log ""

  if [ "$SCOPE" = "project" ] || [ "$SCOPE" = "all" ]; then
    log "Project scope:"
    install_project_targets "$SCOPE"
    log ""
  fi

  if [ "$SCOPE" = "global" ] || [ "$SCOPE" = "all" ] || [ "$SCOPE" = "detected" ]; then
    log "User scope:"
    install_global_targets "$SCOPE"
    log ""
  fi

  if [ "$DRY_RUN" -eq 0 ] && [ "$INSTALLED" -eq 0 ]; then
    warn "No agentic CLI detected. Install the skill manually with:"
    warn "  bash install.sh --target <your-cli-skills-dir>"
    return 1
  fi

  if [ "$DRY_RUN" -eq 0 ]; then
    log "Done. Restart the host CLI so it discovers the skill."
    log "Invoke it by describing an idea, or via the host's skill command."
  fi
}

main "$@"

#!/usr/bin/env bash
# uninstall.sh — removes the GithubPill pi port symlinks installed by install.sh.
# Only removes symlinks that point into this repo checkout; never deletes user files.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
PI_HOME="${PI_HOME:-$HOME/.pi}"

remove_link() {
  local name="$1"
  if [ -L "$name" ]; then
    local target
    target="$(readlink "$name")"
    case "$target" in
      "$ROOT"/*)
        rm "$name"
        echo "  removed $(basename "$name")"
        ;;
      *)
        echo "  skipped $(basename "$name") — symlink does not point into this repo"
        ;;
    esac
  else
    echo "  skipped $(basename "$name") — not a symlink or absent"
  fi
}

echo "Uninstalling GithubPill pi port from $PI_HOME:"

remove_link "$PI_HOME/agent/skills/githubpill"
remove_link "$PI_HOME/agent/extensions/githubpill-safe-clone-guard.ts"
remove_link "$PI_HOME/agent/extensions/githubpill-subagent"
remove_link "$PI_HOME/agent/agents/githubpill-judge.md"

echo ""
echo "Done. Restart pi or run /reload."

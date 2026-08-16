#!/usr/bin/env bash
# test-pi-safe-clone-guard.sh — unit tests for pi/scripts/safe-clone-guard.sh
#
# The pi port enforces GithubPill's clone-safety contract via a bash spawn-hook
# extension (pi/extensions/githubpill-safe-clone-guard.ts) that delegates to
# this script. These tests verify the script itself:
#  - rewrites `git clone` with the clone-safety contract
#  - denies oversize repos via gh api size pre-check
#  - honours GITHUBPILL_MAX_SIZE_KB override
#  - passes through non-clone commands
#  - handles the ssh:// git@ form
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
# shellcheck source=lib/assert.sh
source "$HERE/lib/assert.sh"
export PATH="$HERE/lib/mock-bin:$PATH"

_log "=== test-pi-safe-clone-guard ==="

GUARD="$ROOT/pi/scripts/safe-clone-guard.sh"

# Case 1: git clone gets rewritten with safety flags
export MOCK_GH_FIXTURE='100'
OUT=$(bash "$GUARD" 'git clone https://github.com/octocat/Hello-World /tmp/test')
assert_contains "REWRITE:" "$OUT" "rewrite prefix emitted"
assert_contains "GIT_LFS_SKIP_SMUDGE=1" "$OUT" "lfs skip injected"
assert_contains "--depth 1" "$OUT" "depth 1 injected"
assert_contains "--filter=blob:none" "$OUT" "filter blob:none injected"
assert_contains "--single-branch" "$OUT" "single-branch injected"
assert_contains "--no-tags" "$OUT" "no-tags injected"
assert_contains "timeout 60" "$OUT" "timeout injected"
assert_contains "https://github.com/octocat/Hello-World /tmp/test" "$OUT" "original target preserved"

# Case 2: oversize repo (> 50000 KB) gets DENIED
export MOCK_GH_FIXTURE='99999'
OUT=$(bash "$GUARD" 'git clone https://github.com/torvalds/linux /tmp/big')
assert_contains "DENY:" "$OUT" "oversize denied"
assert_contains "50000KB cap" "$OUT" "size reason emitted"

# Case 3: GITHUBPILL_MAX_SIZE_KB env override raises the cap
export MOCK_GH_FIXTURE='80000'
export GITHUBPILL_MAX_SIZE_KB=100000
OUT=$(bash "$GUARD" 'git clone https://github.com/torvalds/linux /tmp/big2')
assert_contains "REWRITE:" "$OUT" "override allows up to MAX_SIZE_KB"
unset GITHUBPILL_MAX_SIZE_KB

# Case 4: non-git-clone command passes through
OUT=$(bash "$GUARD" 'ls -la')
assert_eq "PASS" "$OUT" "non-clone command passes through"

# Case 5: git clone via ssh form (git@github.com:owner/repo) gets rewritten
export MOCK_GH_FIXTURE='100'
OUT=$(bash "$GUARD" 'git clone git@github.com:octocat/Hello-World.git /tmp/test3')
assert_contains "REWRITE:" "$OUT" "ssh-form clone rewritten"
assert_contains "--filter=blob:none" "$OUT" "ssh-form clone flags injected"

# Case 6: multi-statement command containing git clone still rewritten
OUT=$(bash "$GUARD" 'cd /tmp && git clone https://github.com/octocat/Hello-World')
assert_contains "REWRITE:" "$OUT" "chained clone rewritten"
assert_contains "timeout 60 git clone" "$OUT" "timeout injected into chain"

# Case 7: gh failure does not block (fails open on the size check, still rewrites)
OUT=$(MOCK_GH_FAIL='ratelimit' bash -c '
  OUT=$(bash "$1" "git clone https://github.com/octocat/Hello-World /tmp/test4")
  printf "%s" "$OUT" | grep -q "REWRITE:" || { echo "FAIL gh-failure should rewrite" >&2; exit 1; }
  printf "%s" "$OUT" | grep -q -- "--depth 1" || { echo "FAIL gh-failure flags" >&2; exit 1; }
  echo "  PASS gh rate-limit failure still rewrites"
' _ "$GUARD")
unset MOCK_GH_FIXTURE

test_summary

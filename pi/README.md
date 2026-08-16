# GithubPill for pi

The GithubPill skill is harness-neutral (Agent Skills standard). This directory
holds everything needed to run it inside [pi](https://github.com/badlogic/pi),
the agent harness that implements that standard.

## What gets installed

| Piece | Source | Installed to | Purpose |
|---|---|---|---|
| The skill | `skills/githubpill/` | `~/.pi/agent/skills/githubpill` | The protocol (same SKILL.md + references Claude Code uses) |
| Clone-safety spawn hook | `pi/extensions/githubpill-safe-clone-guard.ts` | `~/.pi/agent/extensions/` | Port of `hooks/safe-clone-guard.sh` — rewrites `git clone` with the safety contract, denies oversize repos |
| Subagent tool | `pi/extensions/githubpill-subagent/` | `~/.pi/agent/extensions/` | Port of Claude Code's Task tool — parallel judge dispatch for deep search |
| Deep-search judge agent | `pi/agents/githubpill-judge.md` | `~/.pi/agent/agents/` | Standing instructions for per-candidate deep-search judging |
| Guard logic | `pi/scripts/safe-clone-guard.sh` | — (called by the extension) | Harness-agnostic clone-safety contract, unit-tested in CI |

## Install

```bash
bash pi/install.sh        # symlinks the pieces above into ~/.pi
# restart pi, or run /reload in the TUI
```

Uninstall: `bash pi/uninstall.sh`.

## Use

```
/skill:githubpill I want to build a CLI that previews diffs as a side-by-side TUI
```

or just describe an idea naturally — "is there already a tool that does X",
"validate my idea before I start building". Reports land in
`./githubpill-reports/YYYY-MM-DD-<slug>.md`, one per idea, same as Claude Code.

## Prerequisites

- `gh` ≥ 2.55, authenticated (`gh auth login`)
- `jq` ≥ 1.7
- A web-search tool enabled in your pi session (e.g. the `websearch`
  extension). The skill's web cross-check **aborts** without one.
- `bash` ≥ 4 (GNU coreutils on macOS for `timeout`)

## Mapping: Claude Code → pi

| Claude Code | pi |
|---|---|
| `/plugin marketplace add suleman-dawood/githubpill` | `bash pi/install.sh` |
| `/githubpill <idea>` | `/skill:githubpill <idea>` (or description trigger) |
| `WebSearch` tool | `websearch` tool (pi) |
| `Task` tool (subagents) | `subagent` tool (installed by this port) |
| `PreToolUse` hook `safe-clone-guard.sh` | bash spawn-hook extension |
| `allowed-tools` frontmatter | ignored by pi (experimental field); tool access is governed by pi's own tool config |
| `.claude-plugin/` marketplace | not needed — a skill is a directory |

## Design notes

- **One canonical skill.** The protocol (`skills/githubpill/SKILL.md` +
  `references/`) is shared across harnesses. The only harness-specific bits are
  the execution surfaces: Claude Code's hook/Task/WebSearch vs. pi's
  extensions/tools. Do not fork the skill per harness.
- **Safety logic stays in bash.** `pi/scripts/safe-clone-guard.sh` implements
  the same contract as `hooks/safe-clone-guard.sh` as a plain script, so CI can
  unit-test it with mocked `gh` and the TS extension stays a thin adapter. Keep
  the regexes and flags in sync between the two.
- **Deep search degrades gracefully.** The skill's Step DEEP-F uses the host's
  subagent tool when present (`subagent` on pi). Without it, the skill judges
  candidates sequentially in-session — the parallelism is a latency
  optimization, not a correctness requirement.

## Tests

```bash
bash tests/run-all-tests.sh        # unit tests incl. pi guard + pi install structure
bash tests/run-goldens-pi.sh       # live goldens via the pi CLI (needs gh + LLM budget)
```

The pi-specific unit tests:

- `tests/test-pi-safe-clone-guard.sh` — exercises `pi/scripts/safe-clone-guard.sh`
  against mocked `gh` (rewrite / deny / size-cap override / pass-through / ssh form).
- `tests/test-pi-install.sh` — structural validation of the pi tree (files
  present, executable, no `$CLAUDE_PLUGIN_ROOT` leaks into the skill, SKILL.md
  references intact).

# GithubPill for pi

The GithubPill skill follows the Agent Skills standard and is host-neutral.
This directory holds the extras that let it run inside
[pi](https://github.com/badlogic/pi): a subagent tool for parallel deep-search
judging, and the judge agent definition.

## What gets installed

| Piece | Source | Installed to | Purpose |
|---|---|---|---|
| The skill | `skills/githubpill/` | `~/.pi/agent/skills/githubpill` | The protocol (same SKILL.md + references + scripts every host uses) |
| Subagent tool | `pi/extensions/githubpill-subagent/` | `~/.pi/agent/extensions/` | Parallel judge dispatch for deep search — the pi analog of Claude Code's Task tool |
| Deep-search judge agent | `pi/agents/githubpill-judge.md` | `~/.pi/agent/agents/` | Standing instructions for per-candidate deep-search judging |

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

Or describe an idea naturally — "is there already a tool that does X",
"validate my idea before I start building". Reports land in
`./githubpill-reports/YYYY-MM-DD-<slug>.md`, one per idea, same as every host.

## Prerequisites

- `gh` ≥ 2.55, authenticated (`gh auth login`)
- `jq` ≥ 1.7
- A web-search tool enabled in your pi session. The skill's web cross-check
  **aborts** without one.
- `bash` ≥ 4 (GNU coreutils on macOS for `timeout`)

## Mapping: Claude Code → pi

| Capability | Claude Code | pi |
|---|---|---|
| Invoke | `/githubpill <idea>` | `/skill:githubpill <idea>` (or description trigger) |
| Web search | `WebSearch` tool | your web-search tool |
| Subagents | `Task` tool | `subagent` tool (installed by this port) |
| Clone safety | `scripts/safe-clone.sh` | `scripts/safe-clone.sh` (identical) |
| Distribution | `.claude-plugin/` marketplace | a skill is a directory; symlink it |

## Design notes

- **One canonical skill.** The protocol (`skills/githubpill/`) is shared
  across hosts. Host-specific differences are execution surfaces only —
  never fork the skill.
- **Clone safety is a property of the clone script.** `safe-clone.sh`
  enforces the size cap, partial-clone flags, and timeout itself, so every
  host gets the same guarantees without a per-host interception hook.
- **Deep search degrades gracefully.** The deep-search judge uses the host's
  subagent tool when present. Without it, the skill judges candidates
  sequentially in-session — the parallelism is a latency optimization, not a
  correctness requirement.

## Tests

```bash
bash tests/run-all-tests.sh    # unit tests, incl. the pi structural checks
```

`tests/test-pi-install.sh` validates this tree: files present and executable,
the canonical skill free of host-specific leakage, frontmatter and reference
wiring intact, and install/uninstall symmetry.

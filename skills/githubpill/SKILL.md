---
name: githubpill
description: Prior-art reconnaissance for project ideas. Validate whether an idea already exists, inspect the closest candidates' source with file:LINE evidence, or explore a space for openings. Use when the user asks "does this already exist", "validate my idea", "is there already a tool that does X", "prior art check", or wants ideas and directions in a space.
allowed-tools: Bash, Read, Write
---

# GithubPill

Prior-art reconnaissance for project ideas. This skill is a thin wrapper over
the `githubpill` CLI: it searches GitHub, npm, PyPI, and Hacker News,
synthesizes the findings with an LLM, verifies every cited URL live, and
reports.

## Modes

| Mode | Question | Command |
|---|---|---|
| Validate (default) | Does this already exist? | `githubpill "<idea>"` |
| Validate, deep | ...and what does the source actually do? | `githubpill --deep "<idea>"` |
| Explore | What is the shape of this space, and where is the opening? | `githubpill --explore "<space>"` |
| Explore, deep | ...grounded in the top projects' source | `githubpill --deep --explore "<space>"` |

Validate returns a 🟢/🟡/🔴 verdict. Deep adds cloned `path:LINE` evidence for
the top candidates. Explore returns clusters, gaps, and directions.

## Run it

```bash
githubpill "<the user's idea>"
```

If the CLI is not installed:

```bash
npx githubpill "<idea>"                            # from the npm registry
npm install -g githubpill && githubpill "<idea>"   # global install
```

From a checkout: `npm install && npm run build && node dist/cli.js "<idea>"`.

Flags:

| Flag | Effect |
|---|---|
| `--deep` | clone top candidates and cite `path:LINE` evidence |
| `--explore` | explore a space instead of validating an idea |
| `--provider <id>` | LLM provider: `anthropic`, `openai`, `gemini`, `deepseek`, `host` |
| `--json` / `--html` | also write machine-readable / self-contained HTML reports |
| `--out <dir>` | output directory (default `githubpill-reports`) |
| `--sources github,npm,pypi,hackernews` | restrict sources |
| `--model <id>` | override the synthesis model |
| `--no-write` | print the result without writing files |
| `--quiet` | suppress progress on stderr |

## Requirements

An LLM, in one of two ways:

- **The host agent itself (no API key).** If no API key is set, the CLI falls
  back to the `host` provider and drives the installed agentic CLI
  (`claude`, `opencode`, `codex`, or `pi`) to do the reasoning. This is the
  zero-config path: the user's existing agent does the LLM work.
- **An API key** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
  `GEMINI_API_KEY` / `GOOGLE_API_KEY`, or `DEEPSEEK_API_KEY`. Auto-detected, or
  set with `--provider`.

Also:

- `GITHUB_TOKEN` or `GH_TOKEN` — optional but strongly recommended; raises the
  GitHub rate limits. Falls back to `gh auth token`.
- Node.js ≥ 20.

Query generation uses the same LLM when one is available; set
`GITHUBPILL_LLM_QUERIES=0` to use the built-in heuristic planner instead.

## Present the result

Reports land in `./githubpill-reports/` (one per idea or topic). Relay to the user:

- **validate**: the verdict badge and headline (🟢 no close match · 🟡 some
  overlap · 🔴 strong overlap), the top candidates with their label and URL,
  and the report path;
- **explore**: the cluster, gap, and direction summary, and the report path;
- when `--deep` ran, mention that the top candidates carry `path:LINE` evidence
  from their source.

Do not re-judge or re-derive the verdict yourself — it comes from the tool, and
every URL it cites was verified live during the run. If the CLI exits non-zero,
show the user its stderr; do not invent a result.

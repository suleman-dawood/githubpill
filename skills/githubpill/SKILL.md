---
name: githubpill
description: Validate whether a project idea already exists before you build it. Use when the user describes a project idea and asks if it already exists, says "validate my idea", "is there already a tool that does X", "does this exist", "prior art check", or invokes the githubpill skill. Searches GitHub, npm, PyPI, and Hacker News, synthesizes the findings with an LLM, verifies every cited URL live, and returns a 🟢/🟡/🔴 verdict.
allowed-tools: Bash, Read, Write
---

# GithubPill

Prior-art reconnaissance for project ideas. This skill is a thin wrapper over
the `githubpill` CLI: the tool searches several sources, synthesizes the
findings with an LLM, verifies every cited URL live, and returns a verdict.

## Run it

```bash
githubpill "<the user's idea>"
```

If the CLI is not installed, use one of:

```bash
npx githubpill "<idea>"                            # from the npm registry
npm install -g githubpill && githubpill "<idea>"   # global install
```

From a checkout of the repository: `npm install && npm run build && node dist/cli.js "<idea>"`.

Useful flags:

| Flag | Effect |
|---|---|
| `--provider <id>` | LLM provider: `anthropic`, `openai`, or `gemini` |
| `--json` / `--html` | also write machine-readable / self-contained HTML reports |
| `--out <dir>` | output directory (default `githubpill-reports`) |
| `--sources github,npm,pypi,hackernews` | restrict which sources are searched |
| `--model <id>` | override the synthesis model |
| `--no-write` | print the verdict without writing files |

## Requirements

- One LLM API key — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
  `GEMINI_API_KEY` / `GOOGLE_API_KEY`, or `DEEPSEEK_API_KEY`. The provider is
  auto-detected from whichever key is present, or set with `--provider`.
- `GITHUB_TOKEN` or `GH_TOKEN` — optional; raises GitHub rate limits. Falls back to `gh auth token`.
- Node.js ≥ 20.

## Present the result

The CLI writes a verdict block to stdout and reports to `./githubpill-reports/`.
Relay to the user:

- the verdict badge and headline (🟢 no close match · 🟡 some overlap · 🔴 strong overlap),
- the top candidates with their label and URL,
- the report path(s).

Do not re-judge or re-derive the verdict yourself — it comes from the tool, and
every URL it cites was verified live during the run. If the CLI exits non-zero,
show the user its stderr; do not invent a verdict.

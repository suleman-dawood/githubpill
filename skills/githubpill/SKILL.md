---
name: githubpill
description: Research for project ideas. Validate whether an idea already exists, inspect the closest candidates' source with file:LINE evidence, or explore a space for openings. Use when the user asks "does this already exist", "validate my idea", "is there already a tool that does X", "prior art check", or wants ideas and directions in a space.
allowed-tools: Bash, Read, Write
---

# GithubPill

Prior-art reconnaissance for project ideas. This skill drives the `githubpill`
CLI: it searches GitHub, npm, PyPI, and Hacker News, verifies every cited URL
live, derives a 🟢/🟡/🔴 verdict mechanically, and renders the report.

**You are the LLM.** There is no nested agent and no API key required. The CLI
does the deterministic work (plan, search, rank, verify, clone, verdict,
render); you do the reasoning (query planning, overlap judging, clustering).
Do not shell out to another agent — write the responses yourself.

## Modes

| Mode | Question | Flags |
|---|---|---|
| Validate (default) | Does this already exist? | `prepare` |
| Validate, deep | ...and what does the source actually do? | `prepare --deep` |
| Explore | What is the shape of this space? | `prepare --explore` |
| Explore, deep | ...grounded in the top projects' source | `prepare --deep --explore` |

Deep adds cloned `path:LINE` evidence for the top candidates. Explore returns
clusters, gaps, and directions.

## Run it

Use a scratch dir, e.g. `WORK=$(mktemp -d)`.

### 1. Plan the search

The heuristic planner is generic. Start from it, then sharpen it with the
domain's real vocabulary (product names, synonyms, adjacent terms):

```bash
githubpill plan "<the user's idea>" > "$WORK/plan.json"
```

Edit `$WORK/plan.json` — keep the shape
`{ sharpened, keywords[], productNames[], topics[], preservedTerms[] }` — and
add the terms a practitioner would search for. Good queries are what make the
retrieval useful. (You may also write the file from scratch.)

### 2. Retrieve and emit the reasoning requests

```bash
githubpill prepare "<the user's idea>" --plan "$WORK/plan.json" --work "$WORK"
```

Add `--deep` and/or `--explore` as needed. This searches, verifies, and (in
deep mode) clones candidates, then writes the prompts you must answer to
`$WORK/requests/` and prints the candidate list. It never contacts an LLM.

### 3. Answer each request

For every file in `$WORK/requests/`, read it (`system`, `prompt`, `jsonSchema`)
and write a JSON response that matches `jsonSchema` to the **same filename**
under `$WORK/responses/`. Keys:

| Key | When | Shape |
|---|---|---|
| `synthesis` | validate | `{ summary, candidates: [{ candidateId, axisScores, rationale }], yourAngle: { summary, missingFeatures[] } }` |
| `exploration` | explore | `{ summary, clusters[], gaps[], directions[] }` |
| `deep/<id>` | deep | `{ axisScores, rationale, evidence: [{ path, line, note }] }` |

Rules the schema and prompts enforce:

- `axisScores` are five integers 0–3: `coreFunction`, `targetAudience`,
  `scope`, `approach`, `activity`. Never emit a label or band — they are
  derived downstream.
- Use the exact `candidateId`s shown in the prompt. Never invent candidates.
- Deep evidence must cite real `path:LINE` values from the file blocks in the
  request; `finish` re-checks every cite against the clone and drops bad ones.
- Judge against the user's desire for novelty: your job is to find matches.

### 4. Finish

```bash
githubpill finish --work "$WORK"
```

`finish` folds your responses in, derives the verdict, verifies deep cites, and
writes the report to `./githubpill-reports/`. Add `--json` / `--html` for extra
formats, `--out <dir>` to change the location.

## Single-shot mode (optional)

If an LLM API key is set, the whole pipeline runs in one command and no
responses are needed:

```bash
githubpill "<idea>"            # provider auto-detected from an API key
githubpill --deep "<idea>"
githubpill --explore "<space>"
```

This path is for humans and CI. Prefer the prepare/finish workflow above when
you are the agent — it is faster and does not start a second agent session.

## Flags

| Flag | Effect |
|---|---|
| `--deep` | clone top candidates and cite `path:LINE` evidence |
| `--explore` | explore a space instead of validating an idea |
| `--work <dir>` | session directory (default `githubpill-session`) |
| `--plan <file>` | query plan JSON for `prepare` |
| `--provider <id>` | LLM provider for single-shot mode: `anthropic`, `openai`, `gemini`, `deepseek`, `host` |
| `--json` / `--html` | also write machine-readable / self-contained HTML reports |
| `--out <dir>` | output directory (default `githubpill-reports`) |
| `--sources github,npm,pypi,hackernews` | restrict sources |
| `--no-write` | print the result without writing files |
| `--quiet` | suppress progress on stderr |

## Requirements

- **The agent-driven workflow needs no LLM key** — you supply the reasoning.
- Single-shot mode needs an API key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
  `GEMINI_API_KEY` / `GOOGLE_API_KEY`, or `DEEPSEEK_API_KEY`) or the `host`
  provider.
- `GITHUB_TOKEN` or `GH_TOKEN` — optional but strongly recommended. Falls back
  to `gh auth token`.
- Node.js ≥ 20.

If the CLI is not installed: `npx githubpill ...`, or
`npm install -g githubpill`. From a checkout:
`npm install && npm run build && node dist/cli.js ...`.

## Present the result

Reports land in `./githubpill-reports/` (one per idea or topic). Relay to the user:

- **validate**: the verdict badge and headline (🟢 no close match · 🟡 some
  overlap · 🔴 strong overlap), the top candidates with their label and URL,
  and the report path;
- **explore**: the cluster, gap, and direction summary, and the report path;
- when deep ran, mention that the top candidates carry `path:LINE` evidence
  from their source.

Do not re-judge or re-derive the verdict yourself — it comes from the tool, and
every URL it cites was verified live during the run. If the CLI exits non-zero,
show the user its stderr; do not invent a result.

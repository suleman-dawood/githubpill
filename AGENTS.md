# AGENTS.md

Guidance for AI coding agents working in this repository. Applies to any
agent that reads `AGENTS.md` (Codex CLI, opencode, Gemini CLI, Cursor, and
other Agent Skills hosts).

## What this project is

GithubPill is a prior-art reconnaissance tool for project ideas. Given a
fuzzy idea, it returns a 🟢/🟡/🔴 verdict on whether something like it
already exists on GitHub, with every cited URL verified live. It ships as an
Agent Skills skill (`skills/githubpill/`) that runs in any compatible host,
plus a Claude Code plugin manifest (`.claude-plugin/`).

## Layout

| Path | What it is |
|---|---|
| `skills/githubpill/SKILL.md` | The skill: hard rules, scripts contract, tier skeletons |
| `skills/githubpill/references/` | Protocol detail loaded on demand (first search, deep search, judging, queries, reports) |
| `skills/githubpill/scripts/` | The executable helpers — the single source of truth for `gh`/`git` behavior |
| `.claude-plugin/` | Claude Code marketplace manifest (thin wrapper over the skill) |
| `pi/` | pi host extras: subagent tool + deep-search judge agent |
| `install.sh` | Installs the skill into every detected agentic CLI |
| `eval/` | Golden eval harness: recall, citation integrity, verdict bands |
| `tests/` | Offline unit tests with mocked `gh`/`git`/`curl` |
| `docs/` | Example reports |

## Commands

```bash
bash tests/run-all-tests.sh      # offline unit + structural tests (no network)
bash tests/install-validation.sh # plugin/skill structure checks
bash eval/run-eval.sh            # offline eval (report lint + structure)
bash eval/run-eval.sh --live     # live eval (needs gh auth; burns API quota)
bash install.sh --project        # dogfood the skill in this repo
```

Run `tests/run-all-tests.sh` before proposing a change. It must pass.

## Conventions

- **The skill is host-neutral.** Never add host-specific identifiers
  (`$CLAUDE_PLUGIN_ROOT`, `WebSearch`, `Task`, one host's tool names) to
  `skills/githubpill/`. Name capabilities generically ("web-search tool",
  "subagent tool"); see the Tool portability section in `SKILL.md`.
- **Scripts are the single source of truth.** Protocol behavior lives in
  `skills/githubpill/scripts/*.sh`, not inlined in `SKILL.md`. Each script
  does one job, prints JSON or a path on stdout, and signals failure with
  documented exit codes. Add tests under `tests/` when you change one.
- **Keep files small and readable.** `SKILL.md` stays a lean driver;
  protocol detail belongs in `references/`. Prefer clear names over comments.
- **Comments explain why, not what.** No ticket numbers, no changelog
  narration, no "Step 1:" banners inside code.
- **Clone safety is enforced in `scripts/safe-clone.sh`.** Never document or
  run a raw `git clone` for candidate repos.
- **Deterministic judging.** Temperature 0 on LLM calls; verdict labels are
  derived mechanically from axis scores, never emitted by the model.

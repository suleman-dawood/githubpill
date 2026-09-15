# AGENTS.md

Guidance for AI coding agents working in this repository. Applies to any
agent that reads `AGENTS.md` (Codex CLI, opencode, Gemini CLI, Cursor, and
other Agent Skills hosts).

## What this project is

GithubPill is prior-art reconnaissance for project ideas. Given a fuzzy idea,
it retrieves candidate projects from several sources, synthesizes the findings
with an LLM, verifies every cited URL live, and returns a 🟢/🟡/🔴 verdict. The
core is a TypeScript CLI/service; the Agent Skills skill in
`skills/githubpill/` is a thin wrapper that invokes it.

## Layout

| Path | What it is |
|---|---|
| `src/adapters/` | Source adapters (GitHub, npm, PyPI, Hacker News) behind one interface |
| `src/retrieval/` | Query planning, fan-out, dedupe, ranking |
| `src/synthesis/` | LLM client, Zod schemas, prompt, mechanical verdict derivation |
| `src/verify/` | Live citation-integrity gate |
| `src/report/` | JSON, Markdown, and HTML renderers |
| `src/pipeline.ts` | Orchestrates the stages; `src/cli.ts` is the entry point |
| `skills/githubpill/` | The Agent Skills wrapper over the CLI |
| `.claude-plugin/` | Claude Code marketplace manifest |
| `install.sh` | Installs the skill into every detected agentic CLI |
| `eval/` | Golden eval cases (harness to come) |

## Commands

```bash
npm install
npm run typecheck     # tsc --noEmit
npm test              # vitest (offline, no network, no API keys)
npm run build         # emit dist/
node dist/cli.js "a CLI that previews diffs as a side-by-side TUI"
```

Run `npm run typecheck && npm test` before proposing a change. Both must pass.
Tests never touch the network or an LLM — adapters are exercised with a mocked
`fetch`, and the LLM client is exercised against a local mock server.

## Architecture rules

- **Adapters are the only source-specific code.** Adding a source means
  implementing `SourceAdapter` (`search` + `verify`) in `src/adapters/` and
  registering it in `src/adapters/index.ts`. Nothing in `retrieval/`,
  `synthesis/`, or `report/` should learn about a specific source.
- **Verdict labels are derived mechanically** from axis scores in
  `src/synthesis/verdict.ts`. The LLM emits axis scores and rationale only —
  never a label, never a band. Do not move that logic into the prompt.
- **Verification is a gate, not a decoration.** A candidate that fails
  `verify` is dropped before synthesis. Do not render unverified URLs.
- **One LLM provider behind `LLMClient`.** Do not add provider-specific
  branching outside `src/synthesis/llm.ts`.
- **The skill stays a wrapper.** `skills/githubpill/SKILL.md` describes how to
  call the CLI; protocol logic belongs in `src/`.

## Conventions

- TypeScript, ESM, `strict`. Import local modules with a `.js` extension.
- Keep files small and single-purpose. Prefer clear names over comments.
- Comments explain why, not what. No ticket numbers, no changelog narration.
- Validate external input at the boundary with Zod; trust internal types.
- New behavior gets a test next to it (`*.test.ts`), offline by default.

# 🟡 Plumbing exists — the integrated *editor* is open

**Sharpened idea:** An open-source AI code editor where the agent's memory is shared across the entire team — Alice's accepted decisions, ruled-out alternatives, and refactoring patterns become context for Bob's next agent turn, versioned in-repo and replayable.

**Verdict:** 🟡 — the shared-memory *layer* is solved (`adelinamart/robrain`, `rohitg00/agentmemory`, GitHub's Squad). What does **not** exist is a Cursor-shaped editor that ships with team-shared agent memory as the headline feature. The integration slot looks open.

## Narrative lead

Two interesting things have happened in the last six months. First, several open-source projects have shipped persistent shared-memory backends for AI agents — RoBrain explicitly captures decisions and vetoes that flow across developers' Cursor / Claude Code sessions; agentmemory provides a hooks/MCP/REST persistent layer. Second, GitHub itself has begun building "agentic memory" into Copilot. But all of this lives *outside* the editor — it's plumbing the user has to assemble. No open-source editor has shipped the experience as default-on, repo-versioned, conflict-flagging team memory.

## Candidates

### 1. adelinamart/robrain — 🔴 LIKELY_MATCH (exact concept, no editor)

- **Stars:** 61 · **Last pushed:** 2026-05-19 (active) · **Verified at:** 2026-05-27 (200 OK)
- Tagline: "Open-source shared memory for teams using AI agents. Captures every decision and the alternatives your team ruled out, and flags when a new decision contradicts an old one." Decisions flow Alice→Bob across Cursor / Claude Code sessions.
- Overlap: this is the *concept* you described, but as a backend layer, not as an editor. Tiny community (61 stars). The opening is to integrate the experience into an editor; the conceptual slot is taken at the layer below.

### 2. rohitg00/agentmemory — 🟡 WORTH_INSPECTING (memory layer, not editor)

- **Stars:** 18,292 · **Last pushed:** 2026-05-26 (active) · **Verified at:** 2026-05-27 (200 OK)
- Persistent memory for coding agents via hooks / MCP / REST. Multi-agent setups share one memory server with `AGENT_ID` tagging.
- Overlap: solves the persistence + multi-agent dimension. No editor surface, no team-decision flagging.

### 3. GitHub Squad — 🟡 WORTH_INSPECTING (Copilot-only, not open-source editor)

- Mentioned in GitHub's blog: agent identity = charter + history in `.squad/`, decisions versioned in-repo. Copilot-coupled, not standalone.
- Overlap: closest *product* shape to your idea but tied to Copilot, not open editor.

## Provenance

0 from gh-search · 3 from web cross-check · 0 SaaS competitors.

## What's next?

**The opening:** Fork an active editor or extension (Cline, Continue, or Zed's agent surface) and integrate **robrain or agentmemory as a default-on, repo-versioned, conflict-flagging team-memory experience.** Differentiators worth shipping:

- *Decisions live in `.git/notes` or a versioned `.team-memory/` folder* — survives clone / branch / merge.
- *Conflict-flagging at write-time*: when a teammate's new decision contradicts a previous accepted one, the agent refuses silently to overwrite and surfaces a "team disagreement detected" prompt.
- *Per-decision provenance*: every memory entry shows who decided, when, why, with link to commit/PR.
- *Per-team trust scopes*: ruled-out alternatives don't all carry equal weight; senior-engineer vetoes weigh more than junior accepts.
- *Selective recall* — agent pulls in only memory relevant to current files, not the global team history.

**Risk:** The technical slot is small (it's effectively a thin layer over robrain/agentmemory plus editor UX). The defensible moat is product polish + integration depth, not novel research. Open-source-as-marketing + paid hosted-team-memory backend is a plausible business shape.

**Pre-commit check:** Talk to a 4-8-person dev team that already uses Cursor or Claude Code. Ask whether they've felt the "we made this decision last sprint, why is the AI re-litigating it" pain. If yes, this is a real product. If no, it's an interesting idea waiting for a problem.

---

## Want to dig deeper?

Type `deep search` to clone robrain and agentmemory and audit the integration surfaces — useful to understand the actual API contract before designing the editor layer.

## Run metadata

- ~3 gh api calls + 1 WebSearch.

# 🔴 This exists — multiple direct open-source equivalents to Cursor

**Sharpened idea:** An open-source AI-powered code editor (VS Code fork or standalone) with built-in AI chat, tab/inline autocomplete, agentic multi-file edits, and codebase-aware retrieval, positioned as a Cursor alternative.

**Verdict:** 🔴 Likely match — the "open-source Cursor" niche is heavily saturated. At least one project (`voideditor/void`) is explicitly branded and built as the open-source Cursor alternative (VS Code fork, ~29k stars). A second VS Code fork (`trypear/pearai-app`) targets the same positioning. Standalone AI-native editors (`zed-industries/zed`, 84k) and dominant VS Code-extension agents (`cline/cline` 62k, `continuedev/continue` 33k, `Aider-AI/aider` 45k) cover every individual capability you listed. Building "an open-source Cursor" without a sharp differentiator will not find oxygen.

## Narrative lead

Several teams have already shipped the exact thing you're describing. **Void** is a literal VS Code fork explicitly marketed as "the open-source Cursor alternative," with AI chat, codebase-aware retrieval, multi-file edits, and bring-your-own-model — although the team paused active development in 2025 to rethink direction. **PearAI** is another VS Code fork in the same lane (smaller, ~690 stars, last pushed May 2025 — stale). **Zed** is a Rust-based standalone editor that now ships agentic multi-agent AI workflows and ACP support. Beyond the editor forks, the *behaviour* you're describing (AI chat + agentic multi-file edits + codebase retrieval) is the daily job of `cline`, `continue`, `aider`, `Roo-Code`, `OpenHands`, `opencode`, and `tabby` — collectively hundreds of thousands of stars and millions of downloads.

## Candidates

### 1. voideditor/void — 🔴 LIKELY_MATCH

- **Stars:** 28,792 · **Last pushed:** 2026-01-12 (≈4-5 months stale)
- **Verified at:** 2026-05-27 (200 OK)
- **What it is:** A VS Code fork shipped explicitly as "the open-source Cursor alternative." AI chat, agentic edits, checkpoints, BYO-model (Anthropic / OpenAI / DeepSeek / Llama / Ollama local), one-click import of VS Code themes / keybinds / settings, direct LLM connections (no proxy backend).
- **Overlap with your idea:** Effectively complete. Every preserved term you listed — "open-source", "Cursor alternative", "AI code editor" — is in this repo's positioning. Same form factor (VS Code fork), same surface (chat + tab + agent + codebase context).
- **Caveat:** The team has publicly paused work to "explore new coding ideas". That is the only opening — a forkable, paused, near-feature-complete codebase.

### 2. trypear/pearai-app — 🔴 LIKELY_MATCH

- **Stars:** 690 · **Last pushed:** 2025-05-20 (≈1 year stale)
- **Verified at:** 2026-05-27 (200 OK)
- **What it is:** VS Code fork bundled with a fork of Continue. Cursor-style positioning ("PearAI: Open Source AI Code Editor"), aims at the same chat + multi-file + bring-your-own-model space.
- **Overlap:** Same form factor (VS Code fork), same Cursor-alternative branding. Smaller community than Void, and the codebase is now a year stale, but the niche claim is identical.

### 3. zed-industries/zed — 🔴 LIKELY_MATCH (different shape, same job)

- **Stars:** 83,850 · **Last pushed:** 2026-05-27 (active)
- **Verified at:** 2026-05-27 (200 OK)
- **What it is:** Standalone GPU-accelerated editor written in Rust, fully open source. Now ships native multi-agent workflows (run agents in parallel across projects, delegate tasks, watch changes live), ACP-based model routing (Anthropic, OpenAI, custom).
- **Overlap:** Not a VS Code fork — but every functional axis you described (AI chat, agentic edits, codebase awareness, BYO-model) is present and actively developed. If your differentiator is "VS Code fork" specifically, Zed isn't a head-on collision; if your differentiator is the AI workflow, Zed already does it at higher polish and 3× the community.

### 4. cline/cline — 🟡 WORTH_INSPECTING

- **Stars:** 62,375 · **Last pushed:** 2026-05-27 (active today)
- **Verified at:** 2026-05-27 (200 OK)
- **What it is:** Open-source autonomous coding agent shipped as a VS Code extension, an SDK, and a headless CLI. Scored 80.8% on SWE-bench Verified per third-party reviews. Reads and edits files across a project, runs terminal commands, reacts to output, manages long-running processes.
- **Overlap:** Not a standalone editor — it lives inside VS Code. But the *capabilities* (agentic multi-file edits, codebase-aware retrieval, tab/chat, BYO-key) are the same surface you'd be building. If a user wants "Cursor-like behaviour without paying Cursor", cline is the first place they land today.

### 5. continuedev/continue — 🟡 WORTH_INSPECTING

- **Stars:** 33,409 · **Last pushed:** 2026-05-26 (active)
- **Verified at:** 2026-05-27 (200 OK)
- **What it is:** Model-agnostic AI assistant as a VS Code / JetBrains extension. Code completion, chat, and contextual assistance with any LLM (local or cloud).
- **Overlap:** Same form factor as cline (extension, not editor) but more focused on inline / completion-style assistance. The strongest "drop into your existing editor" Cursor-replacement story among the open-source projects.

## Also-saw (heavy saturation in the same lane)

- `Aider-AI/aider` — 45,381 stars, active. Terminal-native AI pair programmer with full git-integrated multi-file edits. Different form factor (CLI), same job.
- `anomalyco/opencode` — 165,778 stars, very active. Terminal-native agent, 75+ model providers.
- `OpenHands/OpenHands` — 74,990 stars, very active. Full agent platform with browser + code execution.
- `TabbyML/tabby` — 33,548 stars. Self-hosted code completion (open source Copilot, not Cursor).
- `RooCodeInc/Roo-Code` — 24,161 stars but **archived** May 2026 (per repo metadata + public shutdown notice). VS Code extension fork of cline lineage.
- `codestoryai/aide` — 2,192 stars, **archived** Feb 2025. VS Code fork billed as "open-source AI-native IDE" — closest in spirit to void/pearai but no longer maintained.

## Provenance

3 from gh-search · 6 from web cross-check · 0 SaaS competitors.

## What's next?

This is a saturated lane. Three realistic moves:

1. **Don't build "an open-source Cursor."** The slot is full and the most direct competitor (`void`) is already feature-complete and paused — anyone who wants this picks up that codebase, they don't wait for a new one.
2. **Pick a real differentiator and re-frame.** Examples that aren't currently dominated:
   - *On-device-only, no-network AI editor with verifiable local-only retrieval* (privacy as a hard guarantee, not a marketing line).
   - *Cursor-like editor specialised to one language or domain* (Rust-only, embedded-only, security-research-only) where general-purpose agents fail.
   - *Team-shared agent memory* — none of the listed projects share an agent's repo understanding across a team.
   - *Visual / no-code overlay* on top of a VS Code fork, targeting non-developers (currently unowned).
3. **Fork rather than build.** If you genuinely want the codebase, fork `voideditor/void` (paused, MIT-style fork-friendly) instead of starting from zero.

Re-run `/reporecon` after you've sharpened the differentiator — a more specific sentence will produce a more useful verdict.

---

## Want to dig deeper?

Type `deep search` (or `deep`, `yes`, `dig deeper`) to clone the top candidates and produce file-path-cited evidence of overlap — useful if you want to verify that voideditor/void, zed, and cline really do implement the exact features you imagined (agentic multi-file edits, codebase-aware retrieval, tab autocomplete with model selection). Skip if the saturation above is already convincing.

## Run metadata

- core_remaining (before): 4998 · search_remaining (before): 30
- ~13 gh api calls used (7 discovery + 6 direct verify) + 5 WebSearch calls
- Skipped: cache (miss); deep search (gated on user opt-in)

# 🔴 This exists — saturated lane (cron + DAG over logged-in tabs already shipped)

> **Idea:** Browser-extension AI agent orchestrator running DAGs/cron over logged-in tabs — no API keys, no OAuth
> **Sharpened:** A browser-extension AI agent orchestrator that orchestrates DAGs/crons over the user's logged-in tabs — no API keys, no OAuth.
> **Verdict generated:** 2026-05-27 · first-search pass
> **Provenance:** 6 from gh-search · 4 from web cross-check · 5 SaaS competitors

## Narrative Lead

Every element of this idea has already shipped, in multiple places. **BrowserOS** (Chromium fork with native cron scheduling + drag-and-drop DAG editor) literally matches the differentiator. Anthropic's own **Claude Chrome Extension** ships scheduled workflows across logged-in Gmail/Docs/Sheets *without* API keys. **nanobrowser** (13k stars) is an OSS Chrome extension running multi-agent workflows in the user's session. **alibaba/page-agent** (18k stars), **browser-use/web-ui** (16k), **hangwin/mcp-chrome** (11.7k), and **remorses/playwriter** (3.5k) cover every adjacent variant. **Bardeen, Zapier Agents, Manus, MultiOn, FillApp, Skyvern** are the funded SaaS layer. This is one of the most contested spaces in agent tooling right now.

## Candidates

### 🔴 alibaba/page-agent — LIKELY_MATCH
[github.com/alibaba/page-agent](https://github.com/alibaba/page-agent) · ★18,113 · TypeScript · pushed 2026-05-11 · verified at 2026-05-27T04:33:49Z

- **What it is:** JavaScript in-page GUI agent — control web interfaces with natural language.
- **Overlap:** Owns the in-browser execution surface; alibaba-backed, high star momentum.

### 🔴 browser-use/web-ui — LIKELY_MATCH
[github.com/browser-use/web-ui](https://github.com/browser-use/web-ui) · ★16,006 · Python · pushed 2026-05-15 · verified at 2026-05-27T04:33:49Z

- **What it is:** Web UI for browser-use — run AI agents in the browser.
- **Overlap:** Web-UI atop the dominant browser-agent SDK; covers the orchestration shell.

### 🔴 nanobrowser/nanobrowser — LIKELY_MATCH
[github.com/nanobrowser/nanobrowser](https://github.com/nanobrowser/nanobrowser) · ★13,048 · TypeScript · pushed 2025-11-24 · verified at 2026-05-27T04:33:49Z

- **What it is:** Open-source Chrome extension for AI-powered web automation; multi-agent workflows with BYOK; positioned as OpenAI Operator alternative.
- **Overlap:** Exactly the form factor (Chrome ext) + multi-agent + BYOK. Stale by 6 months — possible reawakening or fork opportunity but the brand is established.

### 🔴 hangwin/mcp-chrome — LIKELY_MATCH
[github.com/hangwin/mcp-chrome](https://github.com/hangwin/mcp-chrome) · ★11,726 · TypeScript · pushed 2026-01-06 · verified at 2026-05-27T04:33:49Z

- **What it is:** Chrome extension exposing browser to AI assistants via MCP — complex browser automation, content analysis, semantic search.
- **Overlap:** Same primitive (extension as MCP server giving AI control over logged-in browser). Slowing momentum (5 months since push).

### 🔴 browseros-ai/BrowserOS — LIKELY_MATCH
[github.com/browseros-ai/BrowserOS](https://github.com/browseros-ai/BrowserOS) · ★11,103 · TypeScript · pushed 2026-05-26 · verified at 2026-05-27T04:33:49Z

- **What it is:** Open-source agentic browser (Chromium fork) — drag-and-drop workflow editor, **cron scheduling**, multi-tab orchestration, alternative to ChatGPT Atlas/Comet/Dia.
- **Overlap:** This product *is* the differentiator. Ships exactly what the idea proposes.

## Closed-Source / SaaS Competitors

- **Claude Chrome Extension** (Anthropic) — schedule workflows on logged-in Gmail/Docs/Notion/CRM tabs, no API keys; multi-tab parallel actions.
- **Bardeen** ([bardeen.ai](https://www.bardeen.ai)) — Chrome extension, 100+ integrations, "Magic Box" AI workflow builder.
- **Zapier Agents** — Chrome extension across 7,000+ apps.
- **Manus Browser Operator** — works in current browser, uses existing logins.
- **FillApp, Skyvern, MultiOn, MindStudio** — adjacent variants with overlapping feature sets.

## What's Next?

Not advisable to enter head-on. Possible narrow wedges:
- **Privacy-first / no-LLM-vendor-data-leak:** local-LLM only, all DOM never leaves device. Combines with idea #7.
- **Domain-specific tab agents:** "accountant's browser agent" with deep, dedicated logic for Xero+QuickBooks+Stripe, vs. general purpose.
- **Audit-grade replay:** combine with idea #2 (replay-and-fork) — every scheduled run has a forkable, reviewable trace useful for finance/compliance.
- **Watch:** BrowserOS is moving fast; Anthropic Chrome extension keeps growing. The window for an OSS lead is small.

## Run Metadata

- candidates verified: 5/5 (all 200 OK)
- SaaS competitors: 5+ (saturated)

> 🔍 **Want deeper evidence?** Type `deep search` to clone BrowserOS and nanobrowser for file-path overlap.

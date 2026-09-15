# 🔴 This exists RepoRecon Report

## Sharpened Idea

An Obsidian plugin that auto-links notes based on semantic similarity between their content.

Preserved terms: `Obsidian`

## Run Metadata

- Timestamp: 2026-05-26T09:20:00Z
- gh rate budget (core) before run: 5000
- gh rate budget (search) before run: 30
- gh rate budget (core) after run: 4973
- gh rate budget (search) after run: 30
- Saturated lane: a flagship semantic-linking plugin already dominates this niche.

## Candidates

### brianpetro/obsidian-smart-connections

[https://github.com/brianpetro/obsidian-smart-connections](https://github.com/brianpetro/obsidian-smart-connections) — verified at 2026-05-26T09:20:36Z

**Verdict:** LIKELY_MATCH

| axis            | score |
|-----------------|-------|
| core_function   | 3     |
| target_audience | 3     |
| scope           | 3     |
| approach        | 3     |
| activity        | 3     |

Staleness: (none)

> README opens with "Save time linking, tagging, and organizing: Smart Connections finds relevant notes so you don't have to" — exact restatement of the sharpened idea; uses AI embeddings (local models or 100+ via Claude/Gemini/ChatGPT/Llama), actively maintained, official Obsidian community plugin.

### logancyang/obsidian-copilot

[https://github.com/logancyang/obsidian-copilot](https://github.com/logancyang/obsidian-copilot) — verified at 2026-05-26T09:20:37Z

**Verdict:** LIKELY_MATCH

| axis            | score |
|-----------------|-------|
| core_function   | 2     |
| target_audience | 3     |
| scope           | 2     |
| approach        | 3     |
| activity        | 3     |

Staleness: (none)

> "The Ultimate AI Assistant for Your Second Brain" — broader than pure semantic linking but includes relevant-notes and vault-search features built on embeddings; same audience and stack, scope axis dropped because it ships chat + many adjacent capabilities, not just auto-linking.

### nhaouari/obsidian-textgenerator-plugin

[https://github.com/nhaouari/obsidian-textgenerator-plugin](https://github.com/nhaouari/obsidian-textgenerator-plugin) — verified at 2026-05-26T09:20:38Z

**Verdict:** WORTH_INSPECTING

| axis            | score |
|-----------------|-------|
| core_function   | 1     |
| target_audience | 3     |
| scope           | 1     |
| approach        | 3     |
| activity        | 2     |

Staleness: (none)

> "Open-source AI Assistant Tool that brings the power of Generative Artificial Intelligence … to generate ideas, attractive titles, summaries, outlines, and whole paragraphs" — AI in Obsidian but the action is text generation, not semantic note-linking; included as adjacent prior art.

## What's Next?

> **Want deep inspection?** Tier 2 will clone the top WORTH_INSPECTING candidates and judge equivalence with file-path evidence. Budget: ~10 minutes, ≤50 gh api calls. Reply `tier 2` (or `yes`/`deep dive`) to start.

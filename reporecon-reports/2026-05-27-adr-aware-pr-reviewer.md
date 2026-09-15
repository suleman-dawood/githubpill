# 🔴 "This exists" RepoRecon Report

## Sharpened Idea

A PR review bot that judges diffs against the project's Architecture Decision Records and CONTEXT.md, flagging architectural drift instead of generic code smells.

Preserved terms: ADR, Architecture Decision Record, PR, CONTEXT.md

## Run Metadata

- Timestamp: 2026-05-27T01:48:00Z
- gh rate budget (core) before run: 4985
- gh rate budget (search) before run: 30
- gh rate budget (core) after run: 4971
- gh rate budget (search) after run: 23

## Candidates

### MOHAMAD-ZUBI/Adrift

[https://github.com/MOHAMAD-ZUBI/Adrift](https://github.com/MOHAMAD-ZUBI/Adrift) — verified at 2026-05-27T01:48:38Z

**Verdict:** LIKELY_MATCH

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 3 |
| target_audience | 3 |
| scope           | 3 |
| approach        | 3 |
| activity        | 2 |
| **sum**         | **14** |

Staleness: none

> Self-described as "An AI PR reviewer focused on architectural regressions, not bugs" — exact-prose match to the sharpened idea; nascent (2★) but pushed last week.

### DecispherHQ/decision-guardian

[https://github.com/DecispherHQ/decision-guardian](https://github.com/DecispherHQ/decision-guardian) — verified at 2026-05-27T01:48:37Z

**Verdict:** LIKELY_MATCH

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 3 |
| target_audience | 3 |
| scope           | 2 |
| approach        | 3 |
| activity        | 2 |
| **sum**         | **13** |

Staleness: none

> "Shift from passive documentation to active enforcement" — most-starred (57★) project in the ADR-enforcement niche; topic-tagged code-review + adr.

### TheoV823/mneme

[https://github.com/TheoV823/mneme](https://github.com/TheoV823/mneme) — verified at 2026-05-27T01:48:39Z

**Verdict:** LIKELY_MATCH

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 3 |
| target_audience | 3 |
| scope           | 2 |
| approach        | 3 |
| activity        | 3 |
| **sum**         | **14** |

Staleness: none

> "Enforce architectural decisions in AI-assisted development" — fresh (yesterday) and explicitly targets the AI-coding workflow, same niche as the proposed bot.

### fireharp/coherence

[https://github.com/fireharp/coherence](https://github.com/fireharp/coherence) — verified at 2026-05-27T01:48:40Z

**Verdict:** WORTH_INSPECTING

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 2 |
| target_audience | 3 |
| scope           | 3 |
| approach        | 2 |
| activity        | 3 |
| **sum**         | **13** |

Staleness: none

> "Drift detector for agent-assisted repos: catch stale docs, ADRs, tests, metrics" — broader scope than just PR review (includes generated artifacts), but overlapping detection mechanism.

### macromania/adr-agent

[https://github.com/macromania/adr-agent](https://github.com/macromania/adr-agent) — verified at 2026-05-27T01:48:41Z

**Verdict:** WORTH_INSPECTING

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 2 |
| target_audience | 3 |
| scope           | 2 |
| approach        | 2 |
| activity        | 1 |
| **sum**         | **10** |

Staleness: stale-12mo

> Generic "ADR agent" — manages ADR lifecycle more than enforces it at PR time; tangential but in the family.

## Closed-Source / SaaS Competitors

### CodeRabbit / GitHub Copilot Code Review (configured with ADR instructions) ⚠️

- **URL:** https://shinglyu.com/blog/2026/03/01/ai-adr-code-review.html (closed source — equivalence unverifiable beyond landing-page evidence)
- **Category:** github-marketplace
- **Evidence snippet:** "GitHub Copilot Code Review can be configured through a .github/copilot-instructions.md file that tells Copilot to act as an architecture compliance reviewer and point to your ADR directory" — established playbook for getting incumbent AI reviewers to enforce ADRs, no new product required.
- **Discovered via:** WebSearch query `ADR architectural decision drift PR review bot github`
- **5-axis scores:** core_function=3 target_audience=3 scope=2 approach=2 activity=3 (sum=13)
- **Tier 1 verdict (capped):** WORTH_INSPECTING

## What's Next?

> **Want deep inspection?** Deep search will clone the top WORTH_INSPECTING
> candidates and judge equivalence with file-path evidence. Budget: ~10 minutes,
> ≤50 gh api calls. Reply `deep search` (aliases: `yes`, `deep dive`, `tier 2`)
> to start.

# 🔴 "This exists" RepoRecon Report (Deep Search)

## Sharpened Idea

A reviewer-assignment bot that picks PR reviewers based on current load, calendar availability, and PTO status — not round-robin.

Preserved terms: reviewer, PR, PTO, calendar

## Your Angle

Workload-aware GitHub reviewer assignment is solved (Joxtacy, pr-accelerator, gitstream); true PTO/calendar/OOO integration on GitHub is the open seam — only the GitLab-only `gitlab-reviewer-roulette` checks availability today.

**Features in your idea absent from all inspected candidates:**

- Native Google Calendar / Outlook PTO awareness on GitHub (no candidate integrates a calendar API)
- Time-zone-bounded assignment (skip reviewers whose working hours haven't started)
- "Currently in a meeting" suppression via calendar busy-blocks
- PTO ingestion from Slack-status / Linear OOO / HR systems
- Escalation when no available reviewer found (don't just pick least-bad)
- Capacity caps as ratio of historical throughput (not raw open-PR count)

## Run Metadata

- Timestamp (deep search): 2026-05-27T01:52:00Z
- gh rate budget (core) consumed across both passes: 34
- gh rate budget (search) consumed across both passes: 14
- Clones attempted: 6
- Clones succeeded: 6
- Clones skipped: 0

## Candidates

### aimd54/gitlab-reviewer-roulette

[https://github.com/aimd54/gitlab-reviewer-roulette](https://github.com/aimd54/gitlab-reviewer-roulette) — verified at 2026-05-27T01:48:45Z — provenance: tier1

**Verdict:** SIGNIFICANT_OVERLAP

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 3 |
| target_audience | 2 |
| scope           | 3 |
| approach        | 3 |
| activity        | 3 |
| **sum**         | **14** |

Staleness: none

**Evidence (file paths):**
- README.md:10 — "automatically selects reviewers based on availability, workload, expertise, and team distribution"
- README.md:15 — "🚦 Availability Management: Checks GitLab status and OOO entries"
- README.md:14 — "📊 Intelligent Weighting: Considers current workload, recent activity, and expertise"

> Closest equivalence to the full spec — but GitLab-only. OOO via GitLab user status, no Google/Outlook integration. The user's idea on GitHub remains uncovered; on GitLab this is already shipped.

### Joxtacy/auto-assign-reviewers

[https://github.com/Joxtacy/auto-assign-reviewers](https://github.com/Joxtacy/auto-assign-reviewers) — verified at 2026-05-27T01:53:20Z — provenance: tier2-gh

**Verdict:** SIGNIFICANT_OVERLAP

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 3 |
| target_audience | 3 |
| scope           | 2 |
| approach        | 3 |
| activity        | 2 |
| **sum**         | **13** |

Staleness: none

**Evidence (file paths):**
- README.md:11-15 — workload signals: open PRs, lines in review, recent review activity (7-day window)
- README.md:62 — `score = (open_prs × 10) + (lines_in_review ÷ 100 × 1) + (recent_reviews × 3)`
- action.yaml:1 — `name: 'Auto Assign PR Reviewer'` GitHub Action entrypoint

> Workload-scored GitHub reviewer assignment with explicit formula and 7-day activity window. Misses calendar/PTO axis entirely. The "lowest workload score" mechanic covers the load-balancing half of the idea on GitHub.

### phoenix-assistant/pr-accelerator

[https://github.com/phoenix-assistant/pr-accelerator](https://github.com/phoenix-assistant/pr-accelerator) — verified at 2026-05-27T01:48:42Z — provenance: tier1

**Verdict:** SIGNIFICANT_OVERLAP

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 3 |
| target_audience | 3 |
| scope           | 3 |
| approach        | 2 |
| activity        | 2 |
| **sum**         | **13** |

Staleness: none

**Evidence (file paths):**
- README.md:1-3 — "Smart reviewer assignment, semantic diff summaries, and load balancing"
- README.md:16-19 — explicit problem framing: wrong reviewer, overloaded reviewers, no summary
- README.md:75-90 — reviewer recommendation output: per-reviewer score, open PRs, estimated wait, expertise file list

> CLI form-factor (npx) rather than GitHub App; load-balancing + expertise via diff analysis + complexity scoring. No PTO/calendar; the "estimated wait" is computed from open-PR depth, not availability. 0★, solo author — closer to a polished prototype than a product.

### linear-b/gitstream

[https://github.com/linear-b/gitstream](https://github.com/linear-b/gitstream) — verified at 2026-05-27T01:48:44Z — provenance: tier1

**Verdict:** PARTIAL_OVERLAP

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 2 |
| target_audience | 3 |
| scope           | 3 |
| approach        | 2 |
| activity        | 3 |
| **sum**         | **13** |

Staleness: none

**Evidence (file paths):**
- README.md:51 — "🤓 Auto-assign PR/MR reviewers" + JS plugin escape hatch
- plugins/ — directory contains custom-plugin examples for pulling external API data into routing decisions
- automations/ — YAML CM (Continuous Merge) automation library

> Mature (330★) YAML rule engine; assignment is rule-driven, not capacity-driven out of the box. The JS plugin hook means PTO/calendar logic *could* be bolted on, but no built-in calendar awareness — user would write that integration themselves.

### shufo/auto-assign-reviewer-by-files

[https://github.com/shufo/auto-assign-reviewer-by-files](https://github.com/shufo/auto-assign-reviewer-by-files) — verified at 2026-05-27T01:53:21Z — provenance: tier2-gh

**Verdict:** PARTIAL_OVERLAP

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 2 |
| target_audience | 3 |
| scope           | 1 |
| approach        | 1 |
| activity        | 2 |
| **sum**         | **9** |

Staleness: none

**Evidence (file paths):**
- README.md:11-30 — glob-pattern→reviewer mapping in `.github/assign-by-files.yml`
- action.yml — GitHub Action manifest

> CODEOWNERS-style file-pattern routing. No capacity awareness, no PTO. In the family but addresses the "expertise" axis only.

### jesusgpo/pr-assign-cli

[https://github.com/jesusgpo/pr-assign-cli](https://github.com/jesusgpo/pr-assign-cli) — verified at 2026-05-27T01:53:19Z — provenance: tier2-gh

**Verdict:** SUPERFICIAL_MATCH

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 2 |
| target_audience | 2 |
| scope           | 1 |
| approach        | 1 |
| activity        | 1 |
| **sum**         | **7** |

Staleness: none

**Evidence (file paths):**
- none

> Repo lacks README / source documentation at HEAD — description-only signal of "score-based workload balancing via monthly contribution metrics". Insufficient cite evidence; capped per JDG-04.

## Closed-Source / SaaS Competitors

### ReviewNudgeBot 🔶

- **URL:** https://reviewnudgebot.com (closed source — equivalence unverifiable beyond landing-page evidence)
- **Category:** closed-source-saas
- **Evidence snippet:** "auto-assignment of reviewers to spread the load and prevent bottlenecks, escalation reminders for stale reviews" — load-aware assignment + nudging; no public claim of PTO/calendar integration.
- **Discovered via:** WebSearch query `PR babysitter tool stale pull request nudge reviewer assignment`
- **5-axis scores:** core_function=3 target_audience=3 scope=2 approach=1 activity=2 (sum=11)
- **Tier 1 verdict (capped):** WORTH_INSPECTING

### Pull Panda / Pull Assigner (GitHub-owned) 🔶

- **URL:** https://github.com/marketplace/pull-panda (closed source — equivalence unverifiable beyond landing-page evidence)
- **Category:** github-marketplace
- **Evidence snippet:** "automatically assigns PR reviewers to every PR" — round-robin/random algorithms, no calendar awareness.
- **Discovered via:** WebSearch query `PR babysitter tool stale pull request nudge reviewer assignment`
- **5-axis scores:** core_function=3 target_audience=3 scope=1 approach=1 activity=2 (sum=10)
- **Tier 1 verdict (capped):** WORTH_INSPECTING

## What's Next?

> Deep search complete. 6 candidates cloned; 0 skipped (oversize/timeout/LFS/injection). See **Your Angle** section above for differentiation guidance.

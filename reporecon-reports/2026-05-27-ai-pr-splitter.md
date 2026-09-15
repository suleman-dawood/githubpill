# 🟡 "Some overlap" RepoRecon Report (Deep Search)

## Sharpened Idea

A bot that detects when a pull request bundles multiple unrelated changes and proposes a stacked-PR split, generating the git commands.

Preserved terms: PR, pull request, stacked

## Your Angle

Stacked-PR tooling is everywhere, but every inspected tool assumes the developer has already split their work into N commits or topics — none of them analyse a bundled PR/branch and *propose* the split. The detection layer is genuinely empty.

**Features in your idea absent from all inspected candidates:**

- Automatic detection that a PR mixes >1 logical change (semantic-clustering or file-graph analysis)
- Bot comment on the open PR suggesting a concrete split with rationale
- Auto-generated git commands or PR-creation script — not a manual workflow
- AI-derived per-cluster commit messages and PR titles
- Reviewer-impact estimate (lines × reviewer-context per proposed sub-PR)
- Optional one-click branch creation via GitHub Action that opens the stacked PRs
- Works on a branch with N _related_ commits (not just one giant squash) — most tools require pre-existing clean commits

## Run Metadata

- Timestamp (deep search): 2026-05-27T01:52:00Z
- gh rate budget (core) consumed across both passes: 34
- gh rate budget (search) consumed across both passes: 14
- Clones attempted: 6
- Clones succeeded: 6
- Clones skipped: 0

## Candidates

### dagelf/git-split-commits

[https://github.com/dagelf/git-split-commits](https://github.com/dagelf/git-split-commits) — verified at 2026-05-27T01:53:22Z — provenance: tier2-gh

**Verdict:** PARTIAL_OVERLAP

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 2 |
| target_audience | 2 |
| scope           | 1 |
| approach        | 2 |
| activity        | 2 |
| **sum**         | **9** |

Staleness: none

**Evidence (file paths):**
- README.md:1-10 — "Split the last N commits on your current branch into N separate branches (one commit per branch)"
- git-split-commits.sh:1 — bash entrypoint
- README.md:22-30 — workflow: `base — A — B — C — D` → `topic/A`, `topic/B`, ...

> Mechanical split-the-commits CLI; user supplies `-n N`, script creates branches and pushes. No detection, no AI suggestion, no bot integration — the closest direct match for the *execution* half of the idea, missing the *detection* half entirely.

### Skydio/revup

[https://github.com/Skydio/revup](https://github.com/Skydio/revup) — verified at 2026-05-27T01:53:23Z — provenance: tier2-gh

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
- README.md:38 — `Topic: foo` tag in commit message drives PR-per-topic grouping
- README.md:34 — "Revup creates multiple independent chains of branches for you in the background"
- revup/ — Python package implementing the topic-tag → PR-tree resolver

> Polished (389★, Skydio-maintained) stacked-PR tool. Splits *by user-authored topic tag*, not by analysis of the diff. Could be the execution backend for a smarter detection layer.

### ejoffe/spr

[https://github.com/ejoffe/spr](https://github.com/ejoffe/spr) — verified at 2026-05-27T01:48:50Z — provenance: tier1

**Verdict:** PARTIAL_OVERLAP

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 2 |
| target_audience | 3 |
| scope           | 2 |
| approach        | 2 |
| activity        | 3 |
| **sum**         | **12** |

Staleness: none

**Evidence (file paths):**
- readme.md:6 — "Each commit becomes a pull request. Stop juggling branches."
- readme.md:9 — "spr turns each one into its own pull request -- kept in sync, correctly ordered, and ready to merge"
- cmd/ — Go CLI entrypoint

> "Commit = PR" model. Splitting is a side-effect of the developer's commit discipline, not an AI/detection layer.

### ezyang/ghstack

[https://github.com/ezyang/ghstack](https://github.com/ezyang/ghstack) — verified at 2026-05-27T01:48:47Z — provenance: tier1

**Verdict:** PARTIAL_OVERLAP

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 2 |
| target_audience | 3 |
| scope           | 2 |
| approach        | 2 |
| activity        | 3 |
| **sum**         | **12** |

Staleness: none

**Evidence (file paths):**
- README.md:5 — "Conveniently submit stacks of diffs to GitHub as separate pull requests"
- README.md:42 — `Prepare a series of commits on top of main, then run ghstack`
- src/ghstack/ — Python implementation
- README.md:15-30 — `automsg = claude` / `codex` config: LLM **summarizes** updates per-PR (closest AI integration in the family)

> PyTorch's canonical stacked-PR tool. The `automsg` LLM hook generates per-PR summaries; doesn't decide *how* to split. Adjacent — could host the split-suggestion feature as a new sub-command.

### getstackit/stackit

[https://github.com/getstackit/stackit](https://github.com/getstackit/stackit) — verified at 2026-05-27T01:53:25Z — provenance: tier2-gh

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
- README.md:34 — "Stackit manages the complexity of this workflow—automatically handling rebases, keeping track of parent-child relationships, and submitting the entire stack"
- README.md:54 — `🤖 AI assistant integration — Generate integration files for Cursor, Claude Code, and Codex`
- README.md:60 — experimental web dashboard with swimlane visualisation

> Newest entrant (pushed today). Tree-structured stacks + AI-agent integration for *creating* stacks; still developer-initiated. Web UI hints at future analysis surfaces but no split-detection feature.

### keith/git-pile

[https://github.com/keith/git-pile](https://github.com/keith/git-pile) — verified at 2026-05-27T01:53:26Z — provenance: tier2-gh

**Verdict:** PARTIAL_OVERLAP

| Axis            | Score (0-3) |
| --------------- | ----------- |
| core_function   | 2 |
| target_audience | 3 |
| scope           | 2 |
| approach        | 2 |
| activity        | 3 |
| **sum**         | **12** |

Staleness: none

**Evidence (file paths):**
- README.md:1-7 — "stacked-diff workflow with git & GitHub … best at handling multiple commits that don't conflict"
- README.md:30 — `git-submitpr` submits one commit per PR from a "pile"

> Lyft-origin shell-script stacked workflow. One-commit-per-PR mechanic; pile must already be authored as separate commits.

## Closed-Source / SaaS Competitors

### Graphite 🔶

- **URL:** https://graphite.com (closed source — equivalence unverifiable beyond landing-page evidence)
- **Category:** closed-source-saas
- **Evidence snippet:** "create, manage, and sync entire stacks of branches with simple commands like gt stack submit and gt stack sync" — the split is performed by the developer.
- **Discovered via:** WebSearch query `automatic pull request splitter decomposition stacked diffs tool`
- **5-axis scores:** core_function=2 target_audience=3 scope=2 approach=2 activity=3 (sum=12)
- **Tier 1 verdict (capped):** WORTH_INSPECTING

### GitHub gh-stack ⚠️

- **URL:** https://github.github.com/gh-stack/ (closed source — equivalence unverifiable beyond landing-page evidence)
- **Category:** github-marketplace
- **Evidence snippet:** "AI agent integration allows compatible AI coding agents to create and manage stacks, breaking a large diff into layers" — GitHub-native extension; nearest claim of "AI breaks a diff into a stack", but agent-driven (Copilot/Codex creates the stack at write-time), not a review-time gate on an existing bundled PR.
- **Discovered via:** WebSearch query `automatic pull request splitter decomposition stacked diffs tool`
- **5-axis scores:** core_function=3 target_audience=3 scope=2 approach=2 activity=3 (sum=13)
- **Tier 1 verdict (capped):** WORTH_INSPECTING

## What's Next?

> Deep search complete. 6 candidates cloned; 0 skipped (oversize/timeout/LFS/injection). See **Your Angle** section above for differentiation guidance.

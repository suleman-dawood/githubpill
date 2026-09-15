# 🟡 Some overlap RepoRecon Report

## Sharpened Idea

An AI agent that triages GitHub issues by automatically labeling them and assigning reviewers.

Preserved terms: `GitHub`, `AI`

## Run Metadata

- Timestamp: 2026-05-26T09:20:00Z
- gh rate budget (core) before run: 5000
- gh rate budget (search) before run: 30
- gh rate budget (core) after run: 4973
- gh rate budget (search) after run: 30
- Tier 1 discovery: 7 archetype queries via gh-search; canonical/topic archetypes returned thin or empty result sets (known gh-search.sh limitation with multi-name queries), so canonical-name candidates were verified directly.

## Candidates

### github/issue-labeler

[https://github.com/github/issue-labeler](https://github.com/github/issue-labeler) — verified at 2026-05-26T09:20:27Z

**Verdict:** WORTH_INSPECTING

| axis            | score |
|-----------------|-------|
| core_function   | 2     |
| target_audience | 3     |
| scope           | 2     |
| approach        | 1     |
| activity        | 2     |

Staleness: (none)

> Labels issues from body content via regex rules — covers the labeling half of the sharpened idea but is regex-driven ("Add/remove 'critical' label if issue contains the words 'urgent' or 'critical'"), not AI, and does not assign reviewers.

### kentaro-m/auto-assign-action

[https://github.com/kentaro-m/auto-assign-action](https://github.com/kentaro-m/auto-assign-action) — verified at 2026-05-26T09:20:28Z

**Verdict:** WORTH_INSPECTING

| axis            | score |
|-----------------|-------|
| core_function   | 2     |
| target_audience | 3     |
| scope           | 2     |
| approach        | 0     |
| activity        | 2     |

Staleness: (none)

> Adds reviewers to PRs on open ("adds reviewers to the pull request when the pull request is opened") — covers the reviewer-assignment half, config-driven, no AI, scoped to PRs not issues.

### probot/stale

[https://github.com/probot/stale](https://github.com/probot/stale) — verified at 2026-05-26T09:20:26Z

**Verdict:** UNRELATED

| axis            | score |
|-----------------|-------|
| core_function   | 1     |
| target_audience | 3     |
| scope           | 1     |
| approach        | 0     |
| activity        | 0     |

Staleness: archived

> Issue-lifecycle bot but the action is "close abandoned Issues and Pull Requests" — not labeling, not assigning, not AI; README explicitly deprecates the project ("the stale app is deprecated and this repository is no longer maintained").

## Caveats

- The CANONICAL-NAMES and TOPIC-TAG archetypes returned thin/empty result sets on GitHub keyword search (multi-name lists are treated as AND, not OR). Closed-source SaaS competitors in this lane (e.g. Dosu) likely exist but were not surfaced because the mandatory Step 3.5 WebSearch cross-check was not executed in this run (skill's `WebSearch` tool unavailable in current session).
- Treat this 🟡 as "no single OSS project does AI + label + reviewer-assignment in one tool, but the labeling and assignment halves are both well-served by rule-based incumbents and an AI-stitched version is differentiated mainly by the AI layer."

---

# 🔴 This exists — Tier 2 update

Tier 2 ran with mandatory WebSearch cross-check + 10 expanded gh queries. Verdict upgraded from 🟡 (Tier 1) to 🔴: multiple AI-specific issue-triage tools exist with active development, plus a flagship closed-source SaaS (Dosu) and a 145k-star incumbent (OpenClaw, surfaced via WebSearch but not cloned).

## Your Angle

No single open-source tool bundles **AI labeling + reviewer assignment + autonomous bot loop** in one workflow; the OSS prior art splits these halves across separate tools, and only proprietary products (Dosu, OpenClaw) unify them — leaving a defensible self-hostable niche if you ship the combined workflow with CODEOWNERS-aware routing.

Differentiating bullets:

- **Bundled label + reviewer assignment in one AI pass.** Existing OSS does one or the other — `triage-assistant` and `triage-panda` only label/comment; `kentaro-m/auto-assign-action` only assigns and is config-driven (no AI).
- **CODEOWNERS- and git-blame-aware reviewer routing.** None of the cloned AI agents consult CODEOWNERS or recent file-touch history to pick reviewers; they would just round-robin or call an LLM blind.
- **Zero-API-key path via GitHub Models inference.** Most existing tools require an Anthropic/OpenAI/Google key (git-bob, triage-panda, claude-github-triage). A GitHub-Models-only path removes that friction for OSS maintainers.
- **Self-hostable with no SaaS callback.** Dosu and OpenClaw are closed-source SaaS / hosted; self-hostable parity is real differentiation for teams with data-residency or vendor-lock concerns.
- **Cross-repo duplicate detection.** `simili-bot` advertised this and is now 404; gap on offer.
- **Reproducibility check on bug reports** (Repro-Bot-style at Metabase) — bundling this into the triage pipeline is unique.

## Tier 2 Inspection Stats

- Clones attempted: 5
- Clones succeeded: 5
- Clones skipped: 0
- gh rate budget (core) Tier 2 delta: −15 (4973 → 4958)
- gh rate budget (search) Tier 2 delta: full refill mid-run (10 search calls, then quota reset)
- WebSearch calls: 5

## Tier 2 Candidates

### haesleinhuepf/git-bob

[https://github.com/haesleinhuepf/git-bob](https://github.com/haesleinhuepf/git-bob) — verified at 2026-05-26T09:23:00Z — provenance: tier2-web

**Verdict:** SIGNIFICANT_OVERLAP

| axis            | score |
|-----------------|-------|
| core_function   | 2     |
| target_audience | 3     |
| scope           | 2     |
| approach        | 3     |
| activity        | 3     |

Evidence: `src/git_bob/_ai_github_utilities.py:2`, `src/git_bob/_ai_github_utilities.py:135`, `README.md:10`

> "git-bob uses AI to solve GitHub issues. It runs inside the GitHub CI" (README:10) and `_ai_github_utilities.py` exposes `review_pull_request()` (line 135) plus issue-context comments; supports Claude/GPT/Gemini/Mistral. Published in Nature (2025). Solves and reviews more than it labels-and-assigns, hence core_function=2.

### d-akhil-kumar/triage-panda

[https://github.com/d-akhil-kumar/triage-panda](https://github.com/d-akhil-kumar/triage-panda) — verified at 2026-05-26T09:23:00Z — provenance: tier2-web

**Verdict:** SIGNIFICANT_OVERLAP

| axis            | score |
|-----------------|-------|
| core_function   | 2     |
| target_audience | 3     |
| scope           | 2     |
| approach        | 3     |
| activity        | 2     |

Evidence: `backend/src/modules/github/domain/services/github-agent.service.ts:29`, `github-agent.service.ts:30`, `README.md:5`

> Agent prompt: "Analyze the issue's title and body to determine appropriate labels and a helpful summary comment" (line 29) → "Call the 'add_github_labels' and 'post_github_comment' tools" (line 30). NestJS + LangGraph + Gemini. Labels-and-comments only; no reviewer-assignment path.

### chhoumann/claude-github-triage

[https://github.com/chhoumann/claude-github-triage](https://github.com/chhoumann/claude-github-triage) — verified at 2026-05-26T09:23:00Z — provenance: tier2-web

**Verdict:** SIGNIFICANT_OVERLAP

| axis            | score |
|-----------------|-------|
| core_function   | 2     |
| target_audience | 3     |
| scope           | 2     |
| approach        | 3     |
| activity        | 2     |

Evidence: `src/issue-triager.ts:19`, `src/issue-triager.ts:39`, `README.md:3`

> "AI-powered GitHub issue triage bot that uses Claude Code SDK to analyze issues in the context of your codebase" (README:3). `IssueTriager` returns `labels: string[]` (line 19) and a `ReviewManager` (line 39) — but `ReviewManager` is for the maintainer to review the bot's suggestions, not for assigning code reviewers, so core_function=2.

### mattleibow/triage-assistant

[https://github.com/mattleibow/triage-assistant](https://github.com/mattleibow/triage-assistant) — verified at 2026-05-26T09:23:00Z — provenance: tier2-web

**Verdict:** SIGNIFICANT_OVERLAP

| axis            | score |
|-----------------|-------|
| core_function   | 2     |
| target_audience | 3     |
| scope           | 2     |
| approach        | 3     |
| activity        | 3     |

Evidence: `action.yml:2`, `src/apply-labels.ts:2`, `README.md:11`

> Action description: "An AI assistant that triages issues by applying labels based on the issue content" (action.yml:2). Modes are `apply-labels` and `engagement-score` — explicitly no reviewer-assignment mode. AI labeler uses GitHub Models inference API.

### latentspace-lab/trIAge

[https://github.com/latentspace-lab/trIAge](https://github.com/latentspace-lab/trIAge) — verified at 2026-05-26T09:23:00Z — provenance: tier2-web

**Verdict:** SIGNIFICANT_OVERLAP

| axis            | score |
|-----------------|-------|
| core_function   | 3     |
| target_audience | 3     |
| scope           | 3     |
| approach        | 3     |
| activity        | 0     |

Evidence: `README.md:35`, `triage/bot.py:78`

> README enumerates Issue Triage explicitly: "Automatically categorize issues by content (feature request, bug, support) and tag them, detect duplicates, prioritize issues, link related issues" (README:35). `bot.py` has `assignee` plumbing (line 78). Broadest OSS scope match — but **archived**, last push 2023-07-17, so activity=0 (still a SIGNIFICANT_OVERLAP per rubric; staleness does not downgrade).

## Closed-Source / SaaS Competitors (surfaced via WebSearch)

These are not GitHub-pool candidates and were not cloned, but reinforce the saturated-lane conclusion:

- **Dosu** ([dosu.dev](https://dosu.dev)) — AI maintainer agent: triage, auto-labeling, duplicate detection, suggested responses. Featured in GitHub's "Awesome Continuous AI" list. SaaS, GitHub App at `apps/dosubot`.
- **OpenClaw** — per [zenvanriel blog](https://zenvanriel.com/ai-engineer-blog/openclaw-github-pr-review-automation-guide/) and [skywork.ai writeup](https://skywork.ai/skypage/en/openclaw-github-issues-automation/2048680640301182976), claims 145k stars in weeks (2026-02), "applies labels, assigns reviewers, or writes code patches through GitHub CLI" — closest to the full sharpened idea. Repo URL not verified in this run.
- **GitHub Agentic Workflows** (preview, 2026-02) — first-party Markdown-defined agents for issue triage / PR review; competes directly on platform.
- **GitHub AI Assessment Comment Labeler** (Marketplace) — first-party AI labeler using GitHub Models.
- **Repro-Bot** (Metabase) — AI bug-reproduction triage agent.
- **trIAge by latentspace-lab** also runs as a hosted GitHub App for demo.

Sources surfaced during this run:
- [GitHub Docs — Triaging an issue with AI](https://docs.github.com/en/issues/tracking-your-work-with-issues/administering-issues/triaging-an-issue-with-ai)
- [Dosu — Automating GitHub Issue Triage](https://dosu.dev/blog/automating-github-issue-triage)
- [GitHub Blog — Building AI-powered GitHub issue triage with the Copilot SDK](https://github.blog/ai-and-ml/github-copilot/building-ai-powered-github-issue-triage-with-the-copilot-sdk/)
- [GitHub Blog — AI labeler and moderator with GitHub Models](https://github.blog/changelog/2025-09-05-github-actions-ai-labeler-and-moderator-with-the-github-models-inference-api/)
- [GitHub Marketplace — AI Issue Labeler](https://github.com/marketplace/coder-labeler)
- [GitHub Marketplace — Auto-assign Issue](https://github.com/marketplace/actions/auto-assign-issue)
- [Metabase — Repro-Bot](https://www.metabase.com/blog/reprobot-github-issue-triage-agent)
- [InfoQ — GitHub Agentic Workflows](https://www.infoq.com/news/2026/02/github-agentic-workflows/)

## Tier 2 Completed Footer

> Tier 2 inspection complete. 5 candidates cloned; 0 skipped (oversize/timeout/LFS/injection). See **Your Angle** section above for differentiation guidance.

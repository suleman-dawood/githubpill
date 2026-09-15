# 🔴 This exists RepoRecon Report

## Sharpened Idea

A CLI tool that diffs two OpenAPI specs and flags breaking changes between versions.

Preserved terms: `CLI`, `OpenAPI`

## Run Metadata

- Timestamp: 2026-05-26T09:20:00Z
- gh rate budget (core) before run: 5000
- gh rate budget (search) before run: 30
- gh rate budget (core) after run: 4973
- gh rate budget (search) after run: 30
- Saturated lane: three independently-maintained CLI tools, all exact-match for the sharpened idea.

## Candidates

### oasdiff/oasdiff

[https://github.com/oasdiff/oasdiff](https://github.com/oasdiff/oasdiff) — verified at 2026-05-26T09:20:30Z

**Verdict:** LIKELY_MATCH

| axis            | score |
|-----------------|-------|
| core_function   | 3     |
| target_audience | 3     |
| scope           | 3     |
| approach        | 3     |
| activity        | 3     |

Staleness: (none)

> README opens with "Command-line and Go package to compare and detect breaking changes in OpenAPI specs" — verbatim restatement of the sharpened idea, actively maintained (pushed within the last week), distributed as CLI binary + Docker image.

### OpenAPITools/openapi-diff

[https://github.com/OpenAPITools/openapi-diff](https://github.com/OpenAPITools/openapi-diff) — verified at 2026-05-26T09:20:31Z

**Verdict:** LIKELY_MATCH

| axis            | score |
|-----------------|-------|
| core_function   | 3     |
| target_audience | 3     |
| scope           | 2     |
| approach        | 2     |
| activity        | 2     |

Staleness: (none)

> README: "Compare two OpenAPI specifications (3.x) and render the difference to HTML plain text, Markdown files, or JSON files" — exact-match core function, Java-based CLI, OpenAPITools umbrella project so well-known in the ecosystem; breaking-change framing is implied by diff output rather than a primary feature.

### Azure/openapi-diff

[https://github.com/Azure/openapi-diff](https://github.com/Azure/openapi-diff) — verified at 2026-05-26T09:20:32Z

**Verdict:** LIKELY_MATCH

| axis            | score |
|-----------------|-------|
| core_function   | 3     |
| target_audience | 2     |
| scope           | 3     |
| approach        | 2     |
| activity        | 2     |

Staleness: (none)

> README: "aka 'Breaking change detector tool' npm package … validating PRs submitted" to azure-rest-api-specs — exact-match function (breaking-change detection on OpenAPI specs); audience score dropped one notch because primary consumer is Azure's spec repos, but the npm package is generally usable.

## Notes

- `Tufin/oasdiff` (also verified) is the legacy mirror of `oasdiff/oasdiff` — same README — deduped out of the candidate list.
- A 4th class of competitors exists as paid SaaS / GitHub-App offerings (Optic, Bump.sh, APIClarity) — not surfaced here because Step 3.5 WebSearch was unavailable in this session, but they reinforce the saturated-lane conclusion.

## What's Next?

> **Want deep inspection?** Tier 2 will clone the top WORTH_INSPECTING candidates and judge equivalence with file-path evidence. Budget: ~10 minutes, ≤50 gh api calls. Reply `tier 2` (or `yes`/`deep dive`) to start.

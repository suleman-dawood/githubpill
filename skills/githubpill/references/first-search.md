# First-Search Protocol (operational detail)

Loaded by `SKILL.md` before a first-search run. Budget: ≤90 s wall clock,
≤10 gh api calls. Emit `[githubpill] start|tick|done|error <stage>` to stderr
around every stage (hard rule 9).

## Step 0 — preflight

Run `scripts/preflight.sh`. On failure, print its stderr verbatim and stop.
Keep the rate-budget JSON — it feeds the report header.

## Step 1 — sharpen the idea

One LLM call, temperature 0. Rewrite the raw idea into:

```
<one-sentence what / for-whom / how> + 3–5 differentiator keywords
```

Apply the Sharpening and Proper-Noun Preservation rules from
`query-patterns.md` (ALL-CAPS acronyms, CamelCase product names, hyphenated
technical terms, quoted phrases, capitalized compounds, domain jargon must
survive verbatim — paraphrasing them away is the top distortion risk).
Output schema:

```json
{
  "sharpened_sentence": "≤220 chars",
  "preserved_terms": ["..."],
  "differentiator_keywords": ["3–5 kebab-case tokens"]
}
```

Re-scan the sharpened sentence: every preserved term must appear verbatim.
If one was paraphrased away, re-prompt once with the term list re-injected;
if it is still dropped, surface that to the user.

## Step 2 — generate 7 queries

One LLM call → JSON array of exactly 7 strings, one per archetype
(LITERAL, SYNONYM-SHIFTED, OUTCOME-FRAMED, TECH-STACK-FRAMED,
ADJACENT-DOMAIN, CANONICAL-NAMES, TOPIC-TAG). Definitions and examples live
in `query-patterns.md`. Every query contains at least one preserved term
verbatim, except TOPIC-TAG which is tags-only by construction. Each query is
≤120 chars, single line.

## Step 3 — discover (parallel)

Run all 7 queries through `scripts/gh-search.sh` in parallel, concurrency
cap 4 (the script retries once on secondary rate limits, so 4 is the safe
ceiling). Collect the 7 JSON arrays as the discovery pool.

```bash
SD="<this skill's scripts dir>"; export SD
mkdir -p "/tmp/githubpill-q-$$"
printf '%s\n' "${QUERIES[@]}" | xargs -P 4 -I{} bash -c '
  SLUG=$(printf "%s" "$1" | sha1sum | head -c 8)
  "$SD/gh-search.sh" "$1" > "/tmp/githubpill-q-'"$$"'/${SLUG}.json"
' _ {}
```

Exit 78 from any search (rate limit exhausted) → abort the run with its
stderr.

## Step 4 — web cross-check (mandatory)

Follow `references/web-cross-check.md` in full. Summary:

- If the host exposes no web-search tool this session, abort the entire run
  (hard rule 4) — do not emit a verdict, do not write a report.
- Generate exactly 5 archetype queries in one LLM call (temperature 0), then
  run all 5 web-searches in parallel (one assistant turn). Archetypes 1/2/5
  must not contain `open source`/`github`/`free`/`self-hosted` qualifiers —
  see the forbidden-qualifier rule in the reference.
- Filter and dedupe per the reference. For each surviving result URL:
  - `github.com/<owner>/<repo>` → `scripts/verify-repo.sh`; on 200 OK merge
    into the gh pool tagged `provenance: first-web`; on non-zero, drop.
  - anything else → `scripts/verify-url.sh`; on success keep in a **separate
    SaaS pool** tagged `provenance: first-web-saas`; on non-zero, drop and
    log the drop reason.
- A single failing web-search call (network, quota): retry that call once
  with a tightened query, then abort the run — never a partial-coverage
  verdict.

## Step 5 — dedup + rank

Apply the rank-sum rule from `query-patterns.md` to the **merged** gh pool
(first-search gh results + first-web GitHub candidates): collect every
`full_name`; rank-sum = sum of 0-indexed positions across the 7 query result
lists, with a penalty of 10 for each query the repo is missing from; take
the top 5 by lowest rank-sum; ties → stars descending, then `full_name`
ascending. The SaaS pool does not participate — it is judged separately in
Step 7.

## Step 6 — verify

Run `scripts/verify-repo.sh "<owner/repo>"` for each of the 5 ranked
candidates, in parallel. Any non-zero exit drops the candidate (hard rule 1).
Keep the verified metadata JSONs — they carry `verified_at` and
`contributor_count` for judging and the report.

## Step 7 — judge

Read `references/judge-rubric.md` first — it defines the 5 axes, the evidence
requirement, and the mechanical derivation. Judging stays sequential at this
tier (5 × ~15 s ≈ 75 s; subagent dispatch overhead would dominate).

**GitHub pool** (`first-gh` / `first-web`): one judge LLM call per candidate,
temperature 0. Inputs: sharpened sentence, preserved terms, verified metadata
JSON, and the first 3000 chars of the README:

```bash
gh api "repos/{owner}/{repo}/readme" --jq .content | base64 -d | head -c 3000
```

Output schema (the last two fields are prose for the humanized report):

```json
{
  "axis_scores": {"core_function": 0, "target_audience": 0, "scope": 0, "approach": 0, "activity": 0},
  "rationale": "≤2 sentences citing evidence for every axis ≥ 2",
  "cand_description_narrative": "2–3 sentences: what the candidate does",
  "cand_overlap_narrative": "1–2 sentences: how it overlaps with the idea"
}
```

**SaaS pool** (`first-web-saas`): same rubric, one call per candidate. Inputs
are the candidate name, evidence snippet, and source query — no README, there
is no source code. The label is capped at `WORTH_INSPECTING`. Add
`cand_evidence_narrative`: a prose conversion of the snippet, never a
verbatim quote.

Derive each `candidate_verdict` mechanically from the first-search threshold
table. Allowed labels: `LIKELY_MATCH`, `WORTH_INSPECTING`, `UNRELATED` —
nothing else in first search.

Run `scripts/staleness.sh "<verified-json>"` per GitHub candidate (SaaS
candidates have no `pushed_at`). Tags annotate the report and inform the
`activity` axis; they never downgrade a verdict.

**Overall verdict** (aggregation from `judge-rubric.md`):

- any GitHub-pool `LIKELY_MATCH` → 🔴
- any SaaS candidate with `axis_sum ≥ 10` → 🔴 with the
  `(saturated lane — closed-source SaaS exists)` note on the report header
- any `WORTH_INSPECTING` → 🟡
- all `UNRELATED` → 🟢

**Devil's advocate.** If the overall verdict is 🟢 and any candidate has any
axis ≥ 2, re-judge up to 2 such candidates (highest `axis_sum` first) with
the reverse-framing prompt from `judge-rubric.md`. Apply the 🟢 → 🟡
downgrade rule if triggered; otherwise note that the pass ran.

**Narrative lead.** After all judging, one final LLM call (temperature 0)
with the sharpened sentence + final candidate set:
`{"narrative_lead": "2–3 sentences: what exists in this space and how it overlaps"}`.

## Step 8 — report

Follow `references/report-template.md`: derive the slug (with collision
suffix), `mkdir -p ./githubpill-reports`, re-snapshot the rate budget,
substitute every `{{PLACEHOLDER}}`, and write the file — never overwrite an
existing report. Omit the entire SaaS section when the pool is empty; omit
the deep-search opt-in footer when the verdict is 🟢.

## Step 9 — verdict block to chat

≤10 lines: overall badge + headline, sharpened sentence, top candidate
(`full_name` + verdict) if any, report path. If the saturated-lane trigger
fired, append the note with the top 1–2 SaaS names. On 🟡/🔴, end with the
deep-search opt-in prompt. On 🟢, stop — deep search is not offered on green
verdicts.

## Multi-idea invocations

Run the full protocol independently per idea; write one report file per idea
(hard rule 2). A consolidated chat summary table is fine — the on-disk
artifacts stay one-per-idea so they can be linked, diffed, and re-run.

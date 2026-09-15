# 🔴 This exists — no-code visual AI app builder lane is saturated

**Sharpened idea:** An open-source AI code editor for non-developers — natural-language → working app, visual overlay on top of a VS Code fork that hides files unless requested, target audience is product managers / designers / domain experts who don't write code.

**Verdict:** 🔴 — `dyad-sh/dyad` (20.4k ⭐, active) sits exactly in this slot today as "the most popular open-source AI app builder", `stackblitz-labs/bolt.diy` (19.4k ⭐) is the community fork of bolt.new with the same positioning, and `wandb/openui` (22.3k ⭐) covers the visual-component-generation slice. The "open-source bolt.new / v0 / Lovable" niche is full.

## Narrative lead

The non-developer-builds-an-app market has been one of the most-fundraised AI categories of the last 18 months (Lovable, v0, bolt.new, Replit Agent), and the open-source mirror of it has materialised quickly. **Dyad** is now the named "open-source AI app builder you can run locally with your own API keys" — it owns the niche on GitHub. **bolt.diy** is a community fork of StackBlitz's bolt.new with active development and a similar promise. **OpenUI** by Weights & Biases targets the same audience for UI generation. Anyone shipping "open-source no-code AI app builder" today is competing with three established projects that collectively have ~60k stars.

## Candidates

### 1. dyad-sh/dyad — 🔴 LIKELY_MATCH

- **Stars:** 20,437 · **Last pushed:** 2026-05-27 (active today) · **Verified at:** 2026-05-27 (200 OK)
- Self-described as "the most popular open-source AI app builder — ownership, transparency, control. Free, local, open-source, any model, IDE integration, deploy to GitHub / Vercel in clicks." Targets non-developers who want to build apps with AI without writing code.
- Overlap: this *is* your idea. Same target audience, same form factor, same value proposition.

### 2. stackblitz-labs/bolt.diy — 🔴 LIKELY_MATCH

- **Stars:** 19,402 · **Last pushed:** 2026-02-07 (~3 months stale) · **Verified at:** 2026-05-27 (200 OK)
- Community fork of bolt.new — in-browser NL→app builder, multi-LLM. Same niche as Dyad with a slightly different distribution (browser-first vs desktop-first).
- Overlap: full. Two top projects in the same lane.

### 3. wandb/openui — 🟡 WORTH_INSPECTING (UI-only slice)

- **Stars:** 22,337 · **Last pushed:** 2026-05-20 (active) · **Verified at:** 2026-05-27 (200 OK)
- Open-source visual UI builder from W&B — natural language → React / HTML components.
- Overlap: covers the UI-generation slice but not full-app scaffolding. Adjacent rather than direct.

## Also-saw

- `bolt.new` (closed-source SaaS, StackBlitz) — the proprietary anchor of this category.
- `v0` (Vercel SaaS), `Lovable` (SaaS) — closed-source incumbents.
- Roo Code, Aide — VS Code-fork-shaped but developer-targeted, not non-developer-targeted.

## Provenance

0 from gh-search · 3 from web cross-check · 3 SaaS competitors observed (bolt.new, v0, Lovable).

## What's next?

**This lane is full.** Three options if you still want to ship here:

1. **Pick a vertical, not a horizontal.** "Open-source AI app builder *for healthcare-compliant apps with HIPAA hooks*" or "*for internal admin tools that talk to existing enterprise SSO and read-only DB connections*". A general no-code builder has nowhere to go; a vertical no-code builder with built-in compliance assumptions still has whitespace.
2. **Compete on the deployment story, not the editor story.** Dyad and bolt.diy generate code well; their weak spot is "now what?" — running, monitoring, updating the generated app. An open-source builder whose differentiator is *post-launch lifecycle* (one-click rollback, schema migration, telemetry, A/B) is meaningfully different.
3. **Don't build this.** This is the most-funded, most-cloned category in AI right now and the open-source slot already has two ~20k-star incumbents. Pick one of the other four ideas in this batch instead.

---

## Want to dig deeper?

Type `deep search` to clone Dyad and bolt.diy and audit their actual generation quality and deployment story — useful only if you're convinced you have a sharp vertical or lifecycle differentiator.

## Run metadata

- ~3 gh api calls + 1 WebSearch.

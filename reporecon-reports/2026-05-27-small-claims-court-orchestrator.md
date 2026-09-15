# 🟡-🔴 Crowded but the SPECIFICALLY-SMALL-CLAIMS slice is partially open

> **Idea:** Small-claims court companion
> **Sharpened:** A web-based AI orchestrator that walks a pro-se litigant through filing a small-claims case — picks the right court+form, drafts the complaint, builds exhibits, preps a hearing script.
> **Verdict generated:** 2026-05-27 · first-search pass
> **Provenance:** 4 from gh-search · 5 from web cross-check · 4+ SaaS competitors

## Narrative Lead

The consumer-legal-AI category is in a feeding frenzy. **Anthropic launched Claude for Legal on 2026-05-12** (legal plug-ins + MCP connectors); the repo [`anthropics/claude-for-legal`](https://github.com/anthropics/claude-for-legal) has 7,711 stars at 3-day-old velocity. **Harvey** raised $200M in March 2026 at an $11B valuation. **ai.law** ships 62 legal-AI tools including AI-drafted complaints in ~3 minutes. **CourtCase** at courtcase.frontofai.com targets pro-se litigants for evidence organization. Bloomberg Law has run multiple "AI-fueled pro se surge" pieces — but courts have also sanctioned 24+ pro-se litigants for AI-generated filings with hallucinated cases. The *specifically* "small-claims (under $10k)" niche is partially open — most named players are broader civil/employment/family-court — but the broader access-to-justice lane is heavily contested and getting more so daily.

## Candidates

### 🟡 anthropics/claude-for-legal — WORTH_INSPECTING (rapidly closing the window)
[github.com/anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal) · ★7,711 · TypeScript · pushed 2026-05-24 · verified at 2026-05-27T05:34Z
- **What it is:** Suite of plugins for legal workflows — vendor agreements, NDAs, SaaS contracts, IP clause review, formatted to work in Claude for Word with tracked changes.
- **Overlap:** Anthropic just entered the legal market. The plugin model lets domain experts ship workflows fast. Whoever competes here has to outrun this curve.

### 🟡 tomwolfe/LawSage — WORTH_INSPECTING (closest mission match)
[github.com/tomwolfe/LawSage](https://github.com/tomwolfe/LawSage) · pushed 2026 · verified at 2026-05-27T05:34Z
- **What it is:** "Democratizes legal access by using AI to translate complex laws into actionable, court-ready defenses for anyone—regardless of income." Voice/text input → precise filings + strategies.
- **Overlap:** Almost the exact "consumer pro-se orchestrator" framing; small but actively developed.

### 🟡 kennedyraju55/court-filing-generator — WORTH_INSPECTING (privacy-first OSS)
[github.com/kennedyraju55/court-filing-generator](https://github.com/kennedyraju55/court-filing-generator) · ★0 · pushed 2026-04-14 · verified at 2026-05-27T05:34Z
- **What it is:** "Privacy-first legal AI tool powered by local Gemma 4 LLM via Ollama. 100% local, zero data leakage." Generates filings, motions, discovery requests.
- **Overlap:** The local-LLM angle is differentiated; relevant for sensitive disputes.

### 🟢 Mahender22/legal-mcp — UNRELATED (infrastructure)
[github.com/Mahender22/legal-mcp](https://github.com/Mahender22/legal-mcp) · ★49 · pushed 2026-03-26
- **What it is:** US legal MCP server — case law + citations + practice management + court filings for AI assistants. Plumbing layer, would compose under a new product.

## Closed-Source / SaaS Competitors

- **ai.law** ([ai.law](https://www.ai.law/)) — 62 litigation tools, federal-court-formatted complaints in 3 min, includes a Dismissal Analyzer.
- **CourtCase** ([courtcase.frontofai.com](https://courtcase.frontofai.com/pro-se-litigant-tools)) — pro-se evidence organization for small claims + family + restraining-order cases.
- **LawConnect** ([lawconnect.com](https://lawconnect.com/en-us/litigation)) — free AI litigation support.
- **Harvey** — $11B valuation, $200M raised in March 2026. BigLaw focus but is squeezing the eval-driven legal stack.
- **Eve, EvenUp** — plaintiff-firm-focused demand letters / complaints.

## What's Next?

The slice that's actually still open and worth chasing:

- **Small-claims (under $10k)-only, jurisdiction-specific.** 3,000+ US small-claims courts each have unique forms, fee schedules, service-of-process rules, judgment-collection procedures. ai.law/CourtCase don't go to this granularity. A jurisdiction-by-jurisdiction launch (start with CA, NY, TX small-claims; add state-by-state) is unclaimed and matches a fast-growing pro-se demand.
- **Judgment collection.** Winning is half the battle; *collecting* (wage garnishment, asset lookup, bank levies) is largely manual and underserved. Could become a sticky companion product.
- **Service-of-process orchestration.** Coordinating sheriffs / process servers / certified-mail by jurisdiction is a logistics problem nobody has automated.
- **Risk:** Anthropic's plugin platform shipped May 24. Someone *will* build a "small-claims plugin" for it before year-end. If you don't ship by Q4 2026, the window closes.

## Run Metadata

- gh core remaining: ~4,983
- WebSearch calls: 5
- candidates verified: 4 (200 OK)
- SaaS competitors named: 5
- One WebSearch call failed (DoNotPay-alternative query, 503 server-side); coverage adequate via the other 4 + gh data.

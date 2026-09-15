# 🟡 Partially exists — capability is solved, the *product* niche is open

**Sharpened idea:** An open-source AI code editor that runs entirely on-device with a verifiable network kill-switch — all model inference local, no telemetry, attestable airgapped operation for regulated / classified / privacy-sensitive work.

**Verdict:** 🟡 — the *capability* (running an open-source AI assistant against a local model) is well-served today by composing `continuedev/continue` + `ollama/ollama` or by using `nomic-ai/gpt4all` / `janhq/jan`. But none of these is positioned as a hardened, airgap-attestable *editor* with a verifiable no-network guarantee. That product slot looks open.

## Narrative lead

If a developer today wants "AI in my editor with zero data leaving the machine," they assemble it: install Ollama or Jan as the local runtime, install Continue (or Cline) as the editor extension, configure it to point at the local endpoint. It works, but the verifiability story is weak — nothing prevents the extension from phoning home, nothing audits the network surface, and no project is selling "airgapped editor" as a brand. A purpose-built, hardened, attestable airgapped AI editor (think: cosign-signed, sandboxed network namespace, audited dependency tree, "this binary cannot make an external request" as a guarantee) does not appear to exist on GitHub.

## Candidates

### 1. continuedev/continue — 🟡 WORTH_INSPECTING (capability overlap, no airgap guarantee)

- **Stars:** 33,409 · **Last pushed:** 2026-05-26 · **Verified at:** 2026-05-27 (200 OK)
- VS Code / JetBrains AI assistant, model-agnostic, supports local Ollama endpoints. The de-facto path for "AI editor with local LLM" today.
- Overlap: capability checkmark, but no kill-switch, no attestation, telemetry exists by default.

### 2. nomic-ai/gpt4all — 🟡 WORTH_INSPECTING

- **Stars:** 77,350 · **Last pushed:** 2025-05-27 (≈1 year stale) · **Verified at:** 2026-05-27 (200 OK)
- Privacy-first local LLM desktop app. Branded as "no internet required". Not a code editor — a chat app with file ingest. Closer in *spirit* to your idea than to a Cursor competitor.

### 3. janhq/jan — 🟡 WORTH_INSPECTING

- **Stars:** 42,688 · **Last pushed:** 2026-05-27 (active) · **Verified at:** 2026-05-27 (200 OK)
- Open-source, MIT, "fully airgapped AI user experience" desktop app. Same shape as gpt4all — chat app with local models, not an editor.

### 4. Mintplex-Labs/anything-llm — 🟡 WORTH_INSPECTING

- **Stars:** 60,648 · **Last pushed:** 2026-05-26 (active) · **Verified at:** 2026-05-27 (200 OK)
- "Private by default" full-stack LLM app with local document retrieval. RAG-shaped, not editor-shaped.

### 5. ollama/ollama — 🟢 UNRELATED (substrate, not competitor)

- **Stars:** 172,375 · Local model runtime. Necessary infrastructure for an airgapped editor, not a competing product.

## Provenance

0 from gh-search (noisy) · 4 from web cross-check · 0 SaaS competitors.

## What's next?

**The opening:** an editor (not a chat app) that ships with airgap as a *verifiable* guarantee — signed binary, network namespace isolation by default, attestation that no telemetry / no auto-update / no model download happens without explicit user-triggered re-flash. Concrete differentiators:

- *Hard* airgap (network namespace lockdown), not "we promise we don't phone home".
- Audit-grade dependency manifest + SBOM at install time.
- Reproducible builds so security teams can validate the binary they received.
- Optional cryptographic attestation of the running build (TPM / DICE).

The buyer is regulated industry (defense, finance, healthcare, legal) and they will pay for the attestation, not for the AI. The AI is table stakes; the audit trail is the product.

Realistic risk: this is a security/compliance product wearing an editor's clothes. Build the security model first; layer on Continue-style features after.

---

## Want to dig deeper?

Type `deep search` to clone Continue, gpt4all, Jan, and anything-llm and audit their actual network surface — useful for confirming the "no project hardens this today" claim before committing to the niche.

## Run metadata

- ~5 gh api calls + 1 WebSearch · core_remaining well within budget.

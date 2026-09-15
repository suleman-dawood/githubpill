# 🔴 SIGNIFICANT_OVERLAP — first-search verdict overturned by clone inspection

> **Idea:** Eval-driven AI agent orchestrator — write evals first, tool synthesizes prompts/nodes that pass; eval marketplace
> **Sharpened:** An eval-driven AI agent orchestrator where you write the eval first and the tool proposes prompts/nodes/tools that pass — TDD for agents, with public eval marketplace.
> **Deep-search completed:** 2026-05-27 (8 candidates cloned, 4 inspected with file-path evidence)
> **Provenance:** 3 from first-search · 8 from deep-search WebSearch · 7 SaaS competitors

## Verdict (deep-search)

🔴 **SIGNIFICANT_OVERLAP** — the first-search 🟡 verdict was too optimistic. Once we cloned and read the actual repos, **all three claimed differentiators turned out to be occupied**:
- *eval marketplace* → `openai/evals` (18.5k★) ships an OSS registry of public evals via YAML in [`evals/registry/evals/`](https://github.com/openai/evals/tree/main/evals/registry/evals)
- *eval-to-prompt synthesis* → `microsoft/PromptWizard` (3.9k★) ships exactly this at [`promptwizard/glue/promptopt/`](https://github.com/microsoft/PromptWizard/tree/main/promptwizard/glue/promptopt)
- *eval-to-workflow synthesis* → `FoundationAgents/AFlow` (510★) ships MCTS-based agentic-workflow auto-generation at [`scripts/optimizer.py`](https://github.com/FoundationAgents/AFlow/blob/main/scripts/optimizer.py) + [`scripts/evaluator.py`](https://github.com/FoundationAgents/AFlow/blob/main/scripts/evaluator.py) + [`scripts/workflow.py`](https://github.com/FoundationAgents/AFlow/blob/main/scripts/workflow.py)

This is exactly the failure mode the skill was hardened against last week (Corust miss): metadata-only first search underestimates lane saturation because the differentiator words don't appear in repo descriptions but are very much present in source code.

## Narrative Lead

The "Eval-Driven Development for agents" discourse is everywhere — Anthropic, Red Hat, MLflow, Fireworks all publish guides — and the OSS supply has caught up. **openai/evals** is *literally* a public registry of YAML-defined evals (`registry/evals/2d_movement.yaml`, `abstract2title.yaml`, ...) — that *is* a marketplace, in pure OSS form, at 18.5k stars. **microsoft/PromptWizard** (3.9k★) self-evolves prompts via LLM critique against an evaluator — the synthesis primitive the idea proposed. **FoundationAgents/AFlow** (ICLR 2025 Oral, 510★) auto-generates entire *agent workflows* (not just prompts) via MCTS in a code-space, optimizing against an evaluator. **evalstate/fast-agent** (3.8k★) ships the `evaluator_optimizer` workflow pattern directly. **stanfordnlp/dspy** (34.7k★) is the productized version of "declare metric, compile prompts." The combo "eval-first + synthesis + marketplace + orchestration" is occupied at every component level. The only remaining wedge is *bundling* and *UX*, not invention.

## Candidates (deep-search verdicts)

### 🔴 openai/evals — SIGNIFICANT_OVERLAP (marketplace component)
[github.com/openai/evals](https://github.com/openai/evals) · ★18,539 · Python · pushed 2026-04-14 · verified at 2026-05-27T04:33:49Z · provenance: deep-web

- **What it is:** "Framework for evaluating LLMs and LLM systems, and **an open-source registry of benchmarks**."
- **Evidence:** [`openai_evals/evals/registry/evals/`](https://github.com/openai/evals/tree/main/evals/registry/evals) contains hundreds of `.yaml` eval files (`2d_movement.yaml`, `abstract2title.yaml`, `aba-mrpc-true-false.yaml` …). [`evals/registry/data/`](https://github.com/openai/evals/tree/main/evals/registry/data) holds the datasets. [`evals/registry/modelgraded/`](https://github.com/openai/evals/tree/main/evals/registry/modelgraded) holds judge templates.
- **Overlap:** Registry + community contributions = the marketplace claim. Not agent-specific (LLM-eval first), but the registry pattern is established and OpenAI-backed.

### 🔴 microsoft/PromptWizard — SIGNIFICANT_OVERLAP (synthesis component)
[github.com/microsoft/PromptWizard](https://github.com/microsoft/PromptWizard) · ★3,867 · Python · pushed 2025-10-13 · verified at 2026-05-27T04:33:49Z · provenance: deep-web

- **What it is:** "Task-Aware Prompt Optimization Framework" — LLM generates, critiques, and refines its own prompts and examples via iterative feedback against an evaluator. Self-evolving prompts.
- **Evidence:** [`promptwizard/glue/promptopt/__init__.py`](https://github.com/microsoft/PromptWizard/blob/main/promptwizard/glue/promptopt/__init__.py) is the optimizer entry point. [`promptwizard/glue/paramlogger/`](https://github.com/microsoft/PromptWizard/tree/main/promptwizard/glue/paramlogger) ships eval-tracking primitives.
- **Overlap:** This *is* the "synthesize a passing prompt from an eval spec" claim, in productized form, from Microsoft Research, ~4k stars.

### 🔴 FoundationAgents/AFlow — SIGNIFICANT_OVERLAP (workflow synthesis component)
[github.com/FoundationAgents/AFlow](https://github.com/FoundationAgents/AFlow) · ★510 · Python · pushed 2025-12-25 · verified at 2026-05-27T04:33:49Z · provenance: deep-web

- **What it is:** "Automating Agentic Workflow Generation" via MCTS in code-represented workflow space (ICLR 2025 Oral).
- **Evidence:** [`scripts/optimizer.py`](https://github.com/FoundationAgents/AFlow/blob/main/scripts/optimizer.py) is the MCTS workflow optimizer; [`scripts/evaluator.py`](https://github.com/FoundationAgents/AFlow/blob/main/scripts/evaluator.py) wires the eval signal; [`scripts/workflow.py`](https://github.com/FoundationAgents/AFlow/blob/main/scripts/workflow.py) holds the generated workflow DAGs; [`scripts/operators.py`](https://github.com/FoundationAgents/AFlow/blob/main/scripts/operators.py) is the node primitive library (Generate / Format / Review / Revise / Ensemble / Test / Programmer).
- **Overlap:** Reports +5.7% over hand-built workflows on HumanEval at 4.55% of GPT-4o cost. The "auto-generate orchestrator from eval" claim is literally this paper + this repo. Academic-stage but published, ICLR Oral, MetaGPT-team backing — productization risk is high.

### 🟡 evalstate/fast-agent — PARTIAL_OVERLAP
[github.com/evalstate/fast-agent](https://github.com/evalstate/fast-agent) · ★3,795 · Python · pushed 2026-05-26 · verified at 2026-05-27T04:33:49Z · provenance: deep-web

- **What it is:** "Code, Build and Evaluate agents" — MCP-first, excellent Model/Skills/ACP support.
- **Evidence:** [`examples/workflows-md/evaluator/`](https://github.com/evalstate/fast-agent/tree/main/examples/workflows-md/evaluator) and [`tests/integration/workflow/evaluator_optimizer/`](https://github.com/evalstate/fast-agent/tree/main/tests/integration/workflow/evaluator_optimizer) — the evaluator-optimizer pattern is a first-class workflow type.
- **Overlap:** Already implements the evaluator→optimizer→agent feedback loop as a workflow primitive. Builder-grade, not consumer marketplace.

## Closed-Source / SaaS Competitors

- **LangSmith** (LangChain, $39/seat) — eval + observability inside LangGraph.
- **Braintrust** ([braintrust.dev](https://www.braintrust.dev), $800M valuation Feb 2026) — eval + observability + native support for 13+ frameworks.
- **LangWatch** ([langwatch.ai](https://langwatch.ai)) — "first platform to truly unify evaluation + observability + simulation"; Agent Simulation Engine.
- **Iris** ([iris-eval.com](https://iris-eval.com)) — markets "Eval-Driven Development" as the brand.
- **MLflow** ([mlflow.org](https://mlflow.org)) — names "Evaluation-Driven Development" as a first-class workflow.
- **Eval Protocol (Fireworks)** — test-driven agent development.
- **promptfoo** ([promptfoo.dev](https://promptfoo.dev), acquired by OpenAI $86M, Mar 2026) + **DeepEval/Confident AI** — eval frameworks.
- **agentoperations/agent-registry** — vendor-neutral *agent + eval-signal* registry (the marketplace primitive, in metadata-store form).

## Your Angle (what's still narrowly open)

The four components are individually occupied. A genuine new entrant needs to be a sharp *bundler*, not an inventor:

- **The "Hugging Face for agent evals"** — `openai/evals` is dataset-shaped, agent-registry is metadata-only. A *browse-clone-fork-tip-the-author* hub specifically for AGENT evals (multi-turn, tool-trajectory, cost-aware) is unclaimed in consumer-grade form.
- **Eval-first IDE that refuses to ship without a passing eval.** Today every eval tool sits *next to* the prompt code; nobody enforces "you cannot save this node without a green eval" at the editor level. This is a UX/IDE bet, not an algorithm bet.
- **Live A/B against rolling production traffic.** PromptWizard / AFlow optimize on a static dataset. Nobody bolts the optimizer onto rolling traffic with statistical-significance stopping rules baked in.
- **Royalties for eval authors.** A real *marketplace* (with payouts to eval contributors) doesn't exist. openai/evals is a free registry; agentoperations/agent-registry is metadata-only. A monetized eval marketplace is unclaimed but probably won't reach scale without a product-led GTM.

**Recommendation:** Do not enter on the generic "eval-driven orchestrator" framing — that is the same trap a generic "AI orchestration framework website" was. Pick one of the four narrow wedges, or pivot to a domain-specific eval-marketplace (vertical agents: customer-support evals, legal-clause evals, RAG-on-medical-records evals) where the discovery problem isn't already solved by openai/evals.

## Run Metadata

- gh core remaining: 4,972 → ~4,940 (deep search ~30 calls)
- gh search expansion: 10 queries (i10) — 3 returned empty due to operator syntax (`stars:>500` rejected), retried with backoff; coverage still adequate
- WebSearch expansion: 5 queries (i10)
- candidates cloned: 4 (PromptWizard, AFlow, openai/evals, fast-agent) at `/tmp/reporecon/run-20260527T044654Z/clones/`
- candidates judged: 4 with file-path evidence; 0 vapor
- total deep-search wall time: ~3 min

## Correction from first-search report

The first-search version of this report said "**eval-marketplace + eval-to-DAG synthesis** is unclaimed in productized form." That conclusion was based on first-search metadata-only signals. Deep search overturns it: the marketplace lives at `openai/evals/evals/registry/`, the synthesis lives at `microsoft/PromptWizard/promptwizard/glue/promptopt/` and `FoundationAgents/AFlow/scripts/optimizer.py`. The lane is more contested than first-search showed; this is exactly the false-🟢 pattern the skill protocol was updated to prevent.

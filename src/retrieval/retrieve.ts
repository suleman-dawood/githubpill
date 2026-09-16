import type { Candidate, ProgressHandler, QueryPlan, SourceRun } from "../types.js";
import type { Config } from "../config.js";
import { createAdapters, type SourceAdapter } from "../adapters/index.js";
import { planQueries, planQueriesWithLlm } from "./query-plan.js";
import { fanout, type AdapterError } from "./fanout.js";
import { rankCandidates } from "./rank.js";
import { verifyCandidates } from "../verify/citations.js";
import type { LLMClient } from "../synthesis/providers/types.js";

export interface RetrieveOptions {
  idea: string;
  config: Config;
  /** When present (and enabled in config), queries are LLM-generated. */
  llm?: LLMClient;
  /** A precomputed plan; skips planning entirely. Wins over `llm`. */
  plan?: QueryPlan;
  /** Defaults to the adapters for `config.sources`. Inject for tests. */
  adapters?: SourceAdapter[];
  onProgress?: ProgressHandler;
  signal?: AbortSignal;
}

export interface Retrieval {
  plan: QueryPlan;
  /** Ranked candidates that passed live verification. */
  candidates: Candidate[];
  runs: SourceRun[];
  hitsFound: number;
  errors: AdapterError[];
  dropped: Candidate[];
  unverified: Candidate[];
  citationsChecked: number;
  citationsAlive: number;
}

/** The shared front half of every mode: plan, search, rank, verify. */
export async function retrieve(options: RetrieveOptions): Promise<Retrieval> {
  const { config } = options;
  const adapters = options.adapters ?? createAdapters(config.sources);
  const progress = options.onProgress;

  progress?.({ type: "stage", stage: "plan" });
  const plan =
    options.plan ??
    (options.llm && config.llmQueries
      ? await planQueriesWithLlm(options.idea, options.llm)
      : planQueries(options.idea));

  progress?.({ type: "stage", stage: "search" });
  const { hits, runs, errors } = await fanout(adapters, plan, config, progress, options.signal);

  progress?.({ type: "stage", stage: "rank" });
  const ranked = rankCandidates(hits, config.maxCandidates);
  progress?.({ type: "ranked", count: ranked.length });

  progress?.({ type: "stage", stage: "verify" });
  const verified = await verifyCandidates(ranked, adapters, config, progress, options.signal);

  return {
    plan,
    candidates: verified.candidates,
    runs,
    hitsFound: hits.length,
    errors,
    dropped: verified.dropped,
    unverified: verified.unverified,
    citationsChecked: verified.checked,
    citationsAlive: verified.alive,
  };
}

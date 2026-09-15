import type { Candidate, ProgressHandler, Report } from "./types.js";
import { loadConfig, type Config } from "./config.js";
import { defaultAdapters, type SourceAdapter } from "./adapters/index.js";
import { planQueries } from "./retrieval/query-plan.js";
import { fanout, type AdapterError } from "./retrieval/fanout.js";
import { rankCandidates } from "./retrieval/rank.js";
import { verifyCandidates } from "./verify/citations.js";
import { synthesize } from "./synthesis/synthesize.js";
import { deriveBand, headlineFor } from "./synthesis/verdict.js";
import type { LLMClient } from "./synthesis/llm.js";

export interface RunOptions {
  idea: string;
  llm: LLMClient;
  config?: Config;
  adapters?: SourceAdapter[];
  onProgress?: ProgressHandler;
  signal?: AbortSignal;
}

export interface RunResult {
  report: Report;
  /** Queries that failed after retries; surfaced so a degraded run is visible. */
  errors: AdapterError[];
  /** Candidates that failed live verification and were dropped. */
  dropped: Candidate[];
}

/**
 * The pipeline: plan queries -> fan out to sources -> rank -> verify live ->
 * synthesize with the LLM -> derive the verdict mechanically.
 */
export async function run(options: RunOptions): Promise<RunResult> {
  const started = Date.now();
  const config = options.config ?? loadConfig();
  const adapters = options.adapters ?? defaultAdapters();
  const progress = options.onProgress;

  progress?.({ type: "stage", stage: "plan" });
  const plan = planQueries(options.idea);

  progress?.({ type: "stage", stage: "search" });
  const { hits, runs, errors } = await fanout(adapters, plan, config, progress, options.signal);

  progress?.({ type: "stage", stage: "rank" });
  const ranked = rankCandidates(hits, config.maxCandidates);
  progress?.({ type: "ranked", count: ranked.length });

  progress?.({ type: "stage", stage: "verify" });
  const verified = await verifyCandidates(ranked, adapters, config, progress, options.signal);

  progress?.({ type: "stage", stage: "synthesize" });
  const synthesis = await synthesize(options.idea, plan, verified.candidates, options.llm);

  progress?.({ type: "stage", stage: "report" });
  const band = deriveBand(synthesis.candidates.map((candidate) => candidate.label));
  const report: Report = {
    idea: options.idea,
    sharpened: plan.sharpened,
    preservedTerms: plan.preservedTerms,
    band,
    headline: headlineFor(band, synthesis.candidates.length),
    summary: synthesis.summary,
    candidates: synthesis.candidates,
    yourAngle: synthesis.yourAngle,
    sourceRuns: runs,
    stats: {
      durationMs: Date.now() - started,
      queriesRun: runs.length,
      hitsFound: hits.length,
      candidatesConsidered: ranked.length,
      candidatesReported: synthesis.candidates.length,
      citationsChecked: verified.checked,
      citationsAlive: verified.alive,
    },
    generatedAt: new Date().toISOString(),
  };

  progress?.({ type: "done", band });
  return { report, errors, dropped: verified.dropped };
}

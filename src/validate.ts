import type { Candidate, ProgressHandler, Report } from "./types.js";
import type { Config } from "./config.js";
import type { SourceAdapter } from "./adapters/index.js";
import type { AdapterError } from "./retrieval/fanout.js";
import { retrieve } from "./retrieval/retrieve.js";
import { synthesize } from "./synthesis/synthesize.js";
import { deriveBand, headlineFor } from "./synthesis/verdict.js";
import type { LLMClient } from "./synthesis/providers/types.js";

export interface ValidateOptions {
  idea: string;
  llm: LLMClient;
  config: Config;
  adapters?: SourceAdapter[];
  onProgress?: ProgressHandler;
  signal?: AbortSignal;
}

export interface ValidateResult {
  report: Report;
  /** Queries that failed after retries; surfaced so a degraded run is visible. */
  errors: AdapterError[];
  /** Candidates that failed live verification and were dropped. */
  dropped: Candidate[];
}

/** Validate an idea: retrieve prior art, judge overlap, derive a verdict. */
export async function validate(options: ValidateOptions): Promise<ValidateResult> {
  const started = Date.now();
  const progress = options.onProgress;

  const retrieval = await retrieve({
    idea: options.idea,
    config: options.config,
    ...(options.adapters ? { adapters: options.adapters } : {}),
    ...(progress ? { onProgress: progress } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  progress?.({ type: "stage", stage: "synthesize" });
  const synthesis = await synthesize(options.idea, retrieval.plan, retrieval.candidates, options.llm);

  progress?.({ type: "stage", stage: "report" });
  const band = deriveBand(synthesis.candidates.map((candidate) => candidate.label));
  const report: Report = {
    idea: options.idea,
    sharpened: retrieval.plan.sharpened,
    preservedTerms: retrieval.plan.preservedTerms,
    band,
    headline: headlineFor(band, synthesis.candidates.length),
    summary: synthesis.summary,
    candidates: synthesis.candidates,
    yourAngle: synthesis.yourAngle,
    sourceRuns: retrieval.runs,
    stats: {
      durationMs: Date.now() - started,
      queriesRun: retrieval.runs.length,
      hitsFound: retrieval.hitsFound,
      candidatesConsidered: retrieval.candidates.length,
      candidatesReported: synthesis.candidates.length,
      citationsChecked: retrieval.citationsChecked,
      citationsAlive: retrieval.citationsAlive,
    },
    depth: "quick",
    generatedAt: new Date().toISOString(),
  };

  progress?.({ type: "done", band });
  return { report, errors: retrieval.errors, dropped: retrieval.dropped };
}

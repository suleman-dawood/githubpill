import type { Candidate, ExplorationReport, ProgressHandler } from "./types.js";
import type { Config } from "./config.js";
import type { SourceAdapter } from "./adapters/index.js";
import type { AdapterError } from "./retrieval/fanout.js";
import { retrieve } from "./retrieval/retrieve.js";
import { synthesizeExploration } from "./synthesis/explore.js";
import type { LLMClient } from "./synthesis/providers/types.js";

export interface ExploreOptions {
  topic: string;
  llm: LLMClient;
  config: Config;
  adapters?: SourceAdapter[];
  onProgress?: ProgressHandler;
  signal?: AbortSignal;
}

export interface ExploreResult {
  report: ExplorationReport;
  errors: AdapterError[];
  dropped: Candidate[];
}

/** Explore a space: retrieve the field, cluster it, and surface gaps and directions. */
export async function explore(options: ExploreOptions): Promise<ExploreResult> {
  const started = Date.now();
  const progress = options.onProgress;

  const retrieval = await retrieve({
    idea: options.topic,
    config: options.config,
    adapters: options.adapters,
    onProgress: progress,
    signal: options.signal,
  });

  progress?.({ type: "stage", stage: "synthesize" });
  const synthesis = await synthesizeExploration(
    options.topic,
    retrieval.plan,
    retrieval.candidates,
    options.llm,
  );

  progress?.({ type: "stage", stage: "report" });
  const report: ExplorationReport = {
    topic: options.topic,
    sharpened: retrieval.plan.sharpened,
    summary: synthesis.summary,
    clusters: synthesis.clusters,
    gaps: synthesis.gaps,
    directions: synthesis.directions,
    candidates: synthesis.candidates,
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
    generatedAt: new Date().toISOString(),
  };

  progress?.({ type: "done" });
  return { report, errors: retrieval.errors, dropped: retrieval.dropped };
}

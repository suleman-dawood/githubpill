import type { Candidate, EvidenceCite, ExplorationReport, ProgressHandler } from "./types.js";
import type { Config } from "./config.js";
import type { SourceAdapter } from "./adapters/index.js";
import type { AdapterError } from "./retrieval/fanout.js";
import { retrieve } from "./retrieval/retrieve.js";
import { synthesizeExploration } from "./synthesis/explore.js";
import { inspectCandidates, type DeepOptions } from "./deep/inspect.js";
import type { LLMClient } from "./synthesis/providers/types.js";

export interface ExploreOptions {
  topic: string;
  llm: LLMClient;
  config: Config;
  adapters?: SourceAdapter[];
  /** Enables deep mode: clone top candidates and ground the report in file:LINE. */
  deep?: DeepOptions;
  onProgress?: ProgressHandler;
  signal?: AbortSignal;
}

export interface ExploreResult {
  report: ExplorationReport;
  errors: AdapterError[];
  dropped: Candidate[];
  unverified: Candidate[];
}

/** Explore a space: retrieve the field, cluster it, and surface gaps and directions. */
export async function explore(options: ExploreOptions): Promise<ExploreResult> {
  const started = Date.now();
  const progress = options.onProgress;

  const retrieval = await retrieve({
    idea: options.topic,
    config: options.config,
    llm: options.llm,
    adapters: options.adapters,
    onProgress: progress,
    signal: options.signal,
  });

  let evidence: Map<string, EvidenceCite[]> | undefined;
  let clonesAttempted: number | undefined;
  let clonesSucceeded: number | undefined;

  if (options.deep) {
    progress?.({ type: "stage", stage: "inspect" });
    const deep = await inspectCandidates({
      candidates: retrieval.candidates,
      plan: retrieval.plan,
      llm: options.llm,
      config: options.config,
      deep: options.deep,
      onProgress: progress,
    });
    evidence = new Map(deep.inspections.map((inspection) => [inspection.candidateId, inspection.evidence]));
    clonesAttempted = deep.attempted;
    clonesSucceeded = deep.succeeded;
  }

  progress?.({ type: "stage", stage: "synthesize" });
  const synthesis = await synthesizeExploration(
    options.topic,
    retrieval.plan,
    retrieval.candidates,
    options.llm,
    evidence,
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
      citationsUnverified: retrieval.unverified.length,
      ...(clonesAttempted === undefined ? {} : { clonesAttempted, clonesSucceeded }),
    },
    depth: options.deep ? "deep" : "quick",
    generatedAt: new Date().toISOString(),
  };

  progress?.({ type: "done" });
  return { report, errors: retrieval.errors, dropped: retrieval.dropped, unverified: retrieval.unverified };
}

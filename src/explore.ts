import type { Candidate, EvidenceCite, ExplorationReport, ProgressHandler } from "./types.js";
import type { Config } from "./config.js";
import type { SourceAdapter } from "./adapters/index.js";
import type { AdapterError } from "./retrieval/fanout.js";
import { retrieve, type Retrieval } from "./retrieval/retrieve.js";
import { synthesizeExploration, type ExplorationSynthesis } from "./synthesis/explore.js";
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

export interface DeepEvidence {
  evidence: Map<string, EvidenceCite[]>;
  attempted: number;
  succeeded: number;
}

/**
 * Assemble an exploration report from an already-retrieved field and an
 * already-clustered synthesis. Shared by the single-shot and delegated paths.
 */
export function buildExplorationReport(params: {
  topic: string;
  retrieval: Retrieval;
  synthesis: ExplorationSynthesis;
  deep?: DeepEvidence;
  durationMs?: number;
}): ExplorationReport {
  const { retrieval, synthesis, deep } = params;

  return {
    topic: params.topic,
    sharpened: retrieval.plan.sharpened,
    summary: synthesis.summary,
    clusters: synthesis.clusters,
    gaps: synthesis.gaps,
    directions: synthesis.directions,
    candidates: synthesis.candidates,
    sourceRuns: retrieval.runs,
    stats: {
      durationMs: params.durationMs ?? 0,
      queriesRun: retrieval.runs.length,
      hitsFound: retrieval.hitsFound,
      candidatesConsidered: retrieval.candidates.length,
      candidatesReported: synthesis.candidates.length,
      citationsChecked: retrieval.citationsChecked,
      citationsAlive: retrieval.citationsAlive,
      citationsUnverified: retrieval.unverified.length,
      ...(deep === undefined ? {} : { clonesAttempted: deep.attempted, clonesSucceeded: deep.succeeded }),
    },
    depth: deep ? "deep" : "quick",
    generatedAt: new Date().toISOString(),
  };
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

  let deep: DeepEvidence | undefined;

  if (options.deep) {
    progress?.({ type: "stage", stage: "inspect" });
    const result = await inspectCandidates({
      candidates: retrieval.candidates,
      plan: retrieval.plan,
      llm: options.llm,
      config: options.config,
      deep: options.deep,
      onProgress: progress,
    });
    deep = {
      evidence: new Map(result.inspections.map((inspection) => [inspection.candidateId, inspection.evidence])),
      attempted: result.attempted,
      succeeded: result.succeeded,
    };
  }

  progress?.({ type: "stage", stage: "synthesize" });
  const synthesis = await synthesizeExploration(
    options.topic,
    retrieval.plan,
    retrieval.candidates,
    options.llm,
    deep?.evidence,
  );

  progress?.({ type: "stage", stage: "report" });
  const report = buildExplorationReport({
    topic: options.topic,
    retrieval,
    synthesis,
    ...(deep ? { deep } : {}),
    durationMs: Date.now() - started,
  });

  progress?.({ type: "done" });
  return { report, errors: retrieval.errors, dropped: retrieval.dropped, unverified: retrieval.unverified };
}

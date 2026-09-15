import type { Candidate, ProgressHandler, Report } from "./types.js";
import type { Config } from "./config.js";
import type { SourceAdapter } from "./adapters/index.js";
import type { AdapterError } from "./retrieval/fanout.js";
import { retrieve } from "./retrieval/retrieve.js";
import { synthesize } from "./synthesis/synthesize.js";
import { deriveBand, deriveLabel, axisSum, headlineFor, capWithoutEvidence } from "./synthesis/verdict.js";
import { inspectCandidates, type DeepOptions } from "./deep/inspect.js";
import type { LLMClient } from "./synthesis/providers/types.js";

export interface ValidateOptions {
  idea: string;
  llm: LLMClient;
  config: Config;
  adapters?: SourceAdapter[];
  /** Enables deep mode when present: clone top candidates and cite file:LINE. */
  deep?: DeepOptions;
  onProgress?: ProgressHandler;
  signal?: AbortSignal;
}

export interface ValidateResult {
  report: Report;
  /** Queries that failed after retries; surfaced so a degraded run is visible. */
  errors: AdapterError[];
  /** Candidates that failed live verification and were dropped. */
  dropped: Candidate[];
  /** Candidates kept but not confirmed (rate limit, server or network error). */
  unverified: Candidate[];
}

/** Validate an idea: retrieve prior art, judge overlap, derive a verdict. */
export async function validate(options: ValidateOptions): Promise<ValidateResult> {
  const started = Date.now();
  const progress = options.onProgress;

  const retrieval = await retrieve({
    idea: options.idea,
    config: options.config,
    adapters: options.adapters,
    onProgress: progress,
    signal: options.signal,
  });

  progress?.({ type: "stage", stage: "synthesize" });
  const synthesis = await synthesize(options.idea, retrieval.plan, retrieval.candidates, options.llm);

  let candidates = synthesis.candidates;
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
    const byId = new Map(deep.inspections.map((inspection) => [inspection.candidateId, inspection]));
    candidates = candidates.map((candidate) => {
      const inspection = byId.get(candidate.id);
      if (!inspection) return candidate;
      const label = deriveLabel(inspection.axisScores);
      return {
        ...candidate,
        axisScores: inspection.axisScores,
        axisSum: axisSum(inspection.axisScores),
        label: inspection.evidence.length > 0 ? label : capWithoutEvidence(label),
        rationale: inspection.rationale,
        evidence: inspection.evidence,
        inspected: true,
      };
    });
    clonesAttempted = deep.attempted;
    clonesSucceeded = deep.succeeded;
  }

  progress?.({ type: "stage", stage: "report" });
  // Lead with the closest matches: overlap first, then popularity.
  const ranked = [...candidates].sort(
    (a, b) => b.axisSum - a.axisSum || (b.stars ?? 0) - (a.stars ?? 0),
  );
  const band = deriveBand(ranked.map((candidate) => candidate.label));
  const report: Report = {
    idea: options.idea,
    sharpened: retrieval.plan.sharpened,
    preservedTerms: retrieval.plan.preservedTerms,
    band,
    headline: headlineFor(band, ranked.length),
    summary: synthesis.summary,
    candidates: ranked,
    yourAngle: synthesis.yourAngle,
    sourceRuns: retrieval.runs,
    stats: {
      durationMs: Date.now() - started,
      queriesRun: retrieval.runs.length,
      hitsFound: retrieval.hitsFound,
      candidatesConsidered: retrieval.candidates.length,
      candidatesReported: ranked.length,
      citationsChecked: retrieval.citationsChecked,
      citationsAlive: retrieval.citationsAlive,
      citationsUnverified: retrieval.unverified.length,
      ...(clonesAttempted === undefined ? {} : { clonesAttempted, clonesSucceeded }),
    },
    depth: options.deep ? "deep" : "quick",
    generatedAt: new Date().toISOString(),
  };

  progress?.({ type: "done", band });
  return { report, errors: retrieval.errors, dropped: retrieval.dropped, unverified: retrieval.unverified };
}

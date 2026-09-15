export const SOURCE_IDS = ["github", "npm", "pypi", "hackernews"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const PROVIDER_IDS = ["anthropic", "openai", "gemini", "deepseek"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

/**
 * A normalized query plan. Adapters translate it into their own query syntax,
 * so the retrieval layer stays source-agnostic.
 */
export interface QueryPlan {
  /** Canonical one-sentence restatement of the idea. */
  sharpened: string;
  /** Multi-word phrases and keywords for keyword search. */
  keywords: string[];
  /** Known product or project names in the space (canonical-name recall). */
  productNames: string[];
  /** Topic and tag hints. */
  topics: string[];
  /** Proper nouns and jargon that must survive verbatim. */
  preservedTerms: string[];
}

/** One raw result as returned by a source, before dedupe and ranking. */
export interface RawHit {
  source: SourceId;
  /** Stable identifier within the source (e.g. "owner/repo", package name). */
  id: string;
  name: string;
  url: string;
  description: string;
  /** 0-based position within the query's result list. */
  rank: number;
  /** The query that surfaced this hit (set by the retrieval fan-out). */
  query?: string;
  stars?: number;
  language?: string;
  lastActivity?: string;
  archived?: boolean;
}

export interface Verification {
  ok: boolean;
  status: number | null;
  checkedAt: string;
  finalUrl?: string;
  error?: string;
}

/** A deduped, ranked candidate ready for synthesis and verification. */
export interface Candidate {
  id: string;
  name: string;
  url: string;
  description: string;
  sources: SourceId[];
  matchedQueries: string[];
  stars?: number;
  language?: string;
  lastActivity?: string;
  archived?: boolean;
  /** Higher is better. */
  score: number;
  verification?: Verification;
}

export type VerdictBand = "green" | "yellow" | "red";

export interface AxisScores {
  coreFunction: number;
  targetAudience: number;
  scope: number;
  approach: number;
  activity: number;
}

export type MatchLabel = "LIKELY_MATCH" | "WORTH_INSPECTING" | "UNRELATED";

export interface CandidateJudgement {
  candidateId: string;
  label: MatchLabel;
  axisScores: AxisScores;
  axisSum: number;
  rationale: string;
}

export interface SourceRun {
  source: SourceId;
  query: string;
  hits: number;
}

export interface ReportStats {
  durationMs: number;
  queriesRun: number;
  hitsFound: number;
  candidatesConsidered: number;
  candidatesReported: number;
  citationsChecked: number;
  citationsAlive: number;
  citationsUnverified?: number;
  clonesAttempted?: number;
  clonesSucceeded?: number;
}

/** A `path:LINE` citation into a cloned repository, with a short note. */
export interface EvidenceCite {
  path: string;
  line: number;
  note: string;
}

/** A candidate joined with its judgement, ready for rendering. */
export interface ReportCandidate {
  id: string;
  name: string;
  url: string;
  description: string;
  sources: SourceId[];
  label: MatchLabel;
  axisScores: AxisScores;
  axisSum: number;
  rationale: string;
  stars?: number;
  language?: string;
  lastActivity?: string;
  archived?: boolean;
  verifiedAt?: string;
  /** True when the candidate was cloned and inspected (deep mode). */
  inspected?: boolean;
  /** File-path evidence from the clone; only present after deep inspection. */
  evidence?: EvidenceCite[];
}

export interface Report {
  idea: string;
  sharpened: string;
  preservedTerms: string[];
  band: VerdictBand;
  headline: string;
  summary: string;
  candidates: ReportCandidate[];
  yourAngle: { summary: string; missingFeatures: string[] };
  sourceRuns: SourceRun[];
  stats: ReportStats;
  depth?: "quick" | "deep";
  generatedAt: string;
}

/** A group of related projects in an exploration. */
export interface ExplorationCluster {
  theme: string;
  summary: string;
  candidateIds: string[];
}

/** Something none of the retrieved projects does, with supporting candidates. */
export interface ExplorationGap {
  observation: string;
  candidateIds: string[];
}

/** A direction worth building, grounded in retrieved candidates. */
export interface ExplorationDirection {
  idea: string;
  why: string;
  groundedIn: string[];
}

/** A retrieved project as shown in an exploration (no verdict attached). */
export interface ExplorationCandidate {
  id: string;
  name: string;
  url: string;
  description: string;
  sources: SourceId[];
  stars?: number;
  language?: string;
  lastActivity?: string;
  verifiedAt?: string;
  /** True when the candidate was cloned and inspected (deep mode). */
  inspected?: boolean;
  /** File-path evidence from the clone; only present after deep inspection. */
  evidence?: EvidenceCite[];
}

export interface ExplorationReport {
  topic: string;
  sharpened: string;
  summary: string;
  clusters: ExplorationCluster[];
  gaps: ExplorationGap[];
  directions: ExplorationDirection[];
  candidates: ExplorationCandidate[];
  sourceRuns: SourceRun[];
  stats: ReportStats;
  depth?: "quick" | "deep";
  generatedAt: string;
}

export type PipelineStage = "plan" | "search" | "rank" | "verify" | "synthesize" | "inspect" | "report";

export type ProgressEvent =
  | { type: "stage"; stage: PipelineStage }
  | { type: "search"; source: SourceId; query: string; hits: number }
  | { type: "ranked"; count: number }
  | { type: "verify"; url: string; ok: boolean; status?: number | null }
  | { type: "inspect"; candidateId: string; ok: boolean; reason?: string }
  | { type: "done"; band?: VerdictBand };

export type ProgressHandler = (event: ProgressEvent) => void;

export type {
  AxisScores,
  Candidate,
  MatchLabel,
  ProgressEvent,
  ProgressHandler,
  QueryPlan,
  RawHit,
  Report,
  ReportCandidate,
  SourceId,
  SourceRun,
  Verification,
  VerdictBand,
} from "./types.js";

export { loadConfig, DEFAULT_MODEL } from "./config.js";
export type { Config } from "./config.js";

export { defaultAdapters, ALL_SOURCES } from "./adapters/index.js";
export type { SearchOptions, SourceAdapter } from "./adapters/index.js";

export { AnthropicClient } from "./synthesis/llm.js";
export type { LLMClient, StructuredRequest } from "./synthesis/llm.js";

export { planQueries } from "./retrieval/query-plan.js";
export { fanout } from "./retrieval/fanout.js";
export type { AdapterError, FanoutResult } from "./retrieval/fanout.js";
export { rankCandidates } from "./retrieval/rank.js";
export { verifyCandidates } from "./verify/citations.js";
export { axisSum, corePair, deriveBand, deriveLabel, headlineFor } from "./synthesis/verdict.js";
export { synthesize } from "./synthesis/synthesize.js";

export { renderJson } from "./report/json.js";
export { renderMarkdown } from "./report/markdown.js";
export { renderHtml } from "./report/html.js";

export { run } from "./pipeline.js";
export type { RunOptions, RunResult } from "./pipeline.js";

export type {
  AxisScores,
  Candidate,
  EvidenceCite,
  ExplorationCandidate,
  ExplorationCluster,
  ExplorationDirection,
  ExplorationGap,
  ExplorationReport,
  MatchLabel,
  ProgressEvent,
  ProgressHandler,
  ProviderId,
  QueryPlan,
  RawHit,
  Report,
  ReportCandidate,
  SourceId,
  SourceRun,
  Verification,
  VerdictBand,
} from "./types.js";
export { PROVIDER_IDS, SOURCE_IDS } from "./types.js";

export { ConfigError, GithubPillError, HttpError, ProviderError, StructuredOutputError } from "./errors.js";
export { createLogger, LOG_LEVELS } from "./logger.js";
export type { Logger, LogLevel } from "./logger.js";

export { DEFAULT_MODELS, loadConfig } from "./config.js";
export type { Config, LlmConfig } from "./config.js";

export { createAdapters } from "./adapters/index.js";
export type { SearchOptions, SourceAdapter } from "./adapters/index.js";

export { AiSdkClient, HostClient, createLLMClient } from "./synthesis/providers/index.js";
export type { LLMClient, ProviderOptions, StructuredRequest } from "./synthesis/providers/index.js";

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
export { renderExplorationMarkdown } from "./report/explore-markdown.js";
export { renderExplorationHtml } from "./report/explore-html.js";

export { retrieve } from "./retrieval/retrieve.js";
export type { Retrieval, RetrieveOptions } from "./retrieval/retrieve.js";
export { validate, buildValidationReport } from "./validate.js";
export type { ValidateOptions, ValidateResult } from "./validate.js";
export { explore, buildExplorationReport } from "./explore.js";
export type { ExploreOptions, ExploreResult } from "./explore.js";
export {
  prepare,
  finish,
  writeSession,
  readSession,
  readResponses,
  cleanupSession,
} from "./session.js";
export type {
  FinishOptions,
  FinishResult,
  PrepareOptions,
  SessionMode,
  SessionRequest,
  SessionState,
} from "./session.js";

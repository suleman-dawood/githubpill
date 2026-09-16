import { execFileSync } from "node:child_process";
import { z } from "zod";
import { PROVIDER_IDS, SOURCE_IDS, type ProviderId, type SourceId } from "./types.js";
import { ConfigError } from "./errors.js";
import { isLogLevel, type LogLevel } from "./logger.js";

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o",
  gemini: "gemini-2.0-flash",
  deepseek: "deepseek-chat",
  host: "host",
};

/** Env vars checked, in order, for each provider's API key. */
const API_KEY_ENV: Record<ProviderId, readonly string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  gemini: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
  deepseek: ["DEEPSEEK_API_KEY"],
  host: [],
};

const BASE_URL_ENV: Record<ProviderId, string> = {
  anthropic: "ANTHROPIC_BASE_URL",
  openai: "OPENAI_BASE_URL",
  gemini: "GEMINI_BASE_URL",
  deepseek: "DEEPSEEK_BASE_URL",
  host: "",
};

/** Agentic CLIs cold-start slowly, so the host provider needs a longer leash. */
const HOST_LLM_TIMEOUT_MS = 120_000;

export interface LlmConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;
  /** For the `host` provider: which agentic CLI to invoke. */
  agent?: string;
  maxTokens: number;
  timeoutMs: number;
}

export interface Config {
  /** GitHub API token. Falls back to the `gh` CLI session when present. */
  githubToken?: string;
  llm: LlmConfig;
  sources: SourceId[];
  perSourceLimit: number;
  maxCandidates: number;
  concurrency: number;
  requestTimeoutMs: number;
  maxQueriesPerSource: number;
  /** Generate search queries with the LLM instead of the heuristic planner. */
  llmQueries: boolean;
  /** Deep mode: how many top candidates to clone and inspect. */
  deepCandidates: number;
  cloneTimeoutMs: number;
  deepMaxFiles: number;
  deepMaxFileLines: number;
  logLevel: LogLevel;
}

export interface ConfigDeps {
  /** Injectable for tests so they never shell out to `gh`. */
  ghToken?: () => string | undefined;
}

const PositiveInt = z.coerce.number().int().positive();

const LimitsSchema = z.object({
  perSourceLimit: PositiveInt.max(100),
  maxCandidates: PositiveInt.max(50),
  concurrency: PositiveInt.max(16),
  requestTimeoutMs: PositiveInt,
  maxQueriesPerSource: PositiveInt.max(20),
  maxTokens: PositiveInt,
  deepCandidates: PositiveInt.max(20),
  cloneTimeoutMs: PositiveInt,
  deepMaxFiles: PositiveInt.max(50),
  deepMaxFileLines: PositiveInt.max(2000),
});

type Limits = z.infer<typeof LimitsSchema>;

function apiKeyFor(env: NodeJS.ProcessEnv, provider: ProviderId): string | undefined {
  return API_KEY_ENV[provider].map((name) => env[name]).find(Boolean);
}

function resolveProvider(env: NodeJS.ProcessEnv): ProviderId {
  const requested = env.GITHUBPILL_PROVIDER?.trim().toLowerCase();
  if (requested) {
    if (!(PROVIDER_IDS as readonly string[]).includes(requested)) {
      throw new ConfigError(
        `Unknown GITHUBPILL_PROVIDER "${requested}". Expected one of: ${PROVIDER_IDS.join(", ")}.`,
      );
    }
    return requested as ProviderId;
  }

  // Prefer a real API key; fall back to the host agent, which needs none.
  const detected = PROVIDER_IDS.find((provider) => provider !== "host" && apiKeyFor(env, provider));
  return detected ?? "host";
}

function resolveLlmTimeout(env: NodeJS.ProcessEnv, provider: ProviderId, fallbackMs: number): number {
  const parsed = PositiveInt.safeParse(env.GITHUBPILL_LLM_TIMEOUT_MS);
  if (parsed.success) return parsed.data;
  return provider === "host" ? HOST_LLM_TIMEOUT_MS : fallbackMs;
}

function resolveLlm(
  env: NodeJS.ProcessEnv,
  provider: ProviderId,
  apiKey: string,
  limits: Limits,
): LlmConfig {
  const baseUrl = env[BASE_URL_ENV[provider]];

  return {
    provider,
    apiKey,
    model: env.GITHUBPILL_MODEL || DEFAULT_MODELS[provider],
    maxTokens: limits.maxTokens,
    timeoutMs: resolveLlmTimeout(env, provider, limits.requestTimeoutMs),
    ...(baseUrl ? { baseUrl } : {}),
    ...(env.GITHUBPILL_AGENT ? { agent: env.GITHUBPILL_AGENT } : {}),
  };
}

function resolveSources(env: NodeJS.ProcessEnv): SourceId[] {
  const raw = env.GITHUBPILL_SOURCES?.trim();
  if (!raw) return [...SOURCE_IDS];

  const requested = raw
    .split(",")
    .map((source) => source.trim().toLowerCase())
    .filter(Boolean);
  const unknown = requested.filter((source) => !(SOURCE_IDS as readonly string[]).includes(source));
  if (unknown.length > 0) {
    throw new ConfigError(
      `Unknown source(s): ${unknown.join(", ")}. Expected: ${SOURCE_IDS.join(", ")}.`,
    );
  }
  return [...new Set(requested)] as SourceId[];
}

function resolveLimits(env: NodeJS.ProcessEnv): Limits {
  try {
    return LimitsSchema.parse({
      perSourceLimit: env.GITHUBPILL_PER_SOURCE_LIMIT ?? 10,
      maxCandidates: env.GITHUBPILL_MAX_CANDIDATES ?? 8,
      concurrency: env.GITHUBPILL_CONCURRENCY ?? 4,
      requestTimeoutMs: env.GITHUBPILL_TIMEOUT_MS ?? 15_000,
      maxQueriesPerSource: env.GITHUBPILL_MAX_QUERIES ?? 6,
      maxTokens: env.GITHUBPILL_MAX_TOKENS ?? 4096,
      deepCandidates: env.GITHUBPILL_DEEP_CANDIDATES ?? 3,
      cloneTimeoutMs: env.GITHUBPILL_CLONE_TIMEOUT_MS ?? 60_000,
      deepMaxFiles: env.GITHUBPILL_DEEP_MAX_FILES ?? 10,
      deepMaxFileLines: env.GITHUBPILL_DEEP_MAX_FILE_LINES ?? 200,
    });
  } catch (error) {
    throw new ConfigError(`Invalid configuration: ${(error as Error).message}`);
  }
}

function resolveLogLevel(env: NodeJS.ProcessEnv): LogLevel {
  const level = env.GITHUBPILL_LOG ?? "";
  return isLogLevel(level) ? level : "info";
}

/** Read the token from an authenticated `gh` session, if one is available. */
function ghCliToken(): string | undefined {
  try {
    const token = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return token || undefined;
  } catch {
    return undefined;
  }
}

function resolveGithubToken(env: NodeJS.ProcessEnv, deps: ConfigDeps): string | undefined {
  return env.GITHUB_TOKEN || env.GH_TOKEN || (deps.ghToken ?? ghCliToken)();
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, deps: ConfigDeps = {}): Config {
  const provider = resolveProvider(env);
  const apiKey = apiKeyFor(env, provider) ?? "";
  if (provider !== "host" && !apiKey) {
    throw new ConfigError(
      `Provider "${provider}" is selected but no API key is set. Set ${API_KEY_ENV[provider].join(" or ")}.`,
    );
  }

  const limits = resolveLimits(env);

  const config: Config = {
    llm: resolveLlm(env, provider, apiKey, limits),
    sources: resolveSources(env),
    perSourceLimit: limits.perSourceLimit,
    maxCandidates: limits.maxCandidates,
    concurrency: limits.concurrency,
    requestTimeoutMs: limits.requestTimeoutMs,
    maxQueriesPerSource: limits.maxQueriesPerSource,
    llmQueries: env.GITHUBPILL_LLM_QUERIES !== "0",
    deepCandidates: limits.deepCandidates,
    cloneTimeoutMs: limits.cloneTimeoutMs,
    deepMaxFiles: limits.deepMaxFiles,
    deepMaxFileLines: limits.deepMaxFileLines,
    logLevel: resolveLogLevel(env),
  };

  const githubToken = resolveGithubToken(env, deps);
  if (githubToken) config.githubToken = githubToken;

  return config;
}

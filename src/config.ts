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
};

/** Env vars checked, in order, for each provider's API key. */
const API_KEY_ENV: Record<ProviderId, readonly string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  gemini: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
  deepseek: ["DEEPSEEK_API_KEY"],
};

const BASE_URL_ENV: Record<ProviderId, string> = {
  anthropic: "ANTHROPIC_BASE_URL",
  openai: "OPENAI_BASE_URL",
  gemini: "GEMINI_BASE_URL",
  deepseek: "DEEPSEEK_BASE_URL",
};

export interface LlmConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;
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
  logLevel: LogLevel;
}

const PositiveInt = z.coerce.number().int().positive();

const LimitsSchema = z.object({
  perSourceLimit: PositiveInt.max(100),
  maxCandidates: PositiveInt.max(50),
  concurrency: PositiveInt.max(16),
  requestTimeoutMs: PositiveInt,
  maxQueriesPerSource: PositiveInt.max(20),
  maxTokens: PositiveInt,
});

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

  const detected = PROVIDER_IDS.find((provider) => apiKeyFor(env, provider));
  if (!detected) {
    const keys = PROVIDER_IDS.flatMap((provider) => API_KEY_ENV[provider]).join(", ");
    throw new ConfigError(`No LLM API key found. Set one of: ${keys}.`);
  }
  return detected;
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

export interface ConfigDeps {
  /** Injectable for tests so they never shell out to `gh`. */
  ghToken?: () => string | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, deps: ConfigDeps = {}): Config {
  const provider = resolveProvider(env);
  const apiKey = apiKeyFor(env, provider);
  if (!apiKey) {
    throw new ConfigError(
      `Provider "${provider}" is selected but no API key is set. Set ${API_KEY_ENV[provider].join(" or ")}.`,
    );
  }

  let limits: z.infer<typeof LimitsSchema>;
  try {
    limits = LimitsSchema.parse({
      perSourceLimit: env.GITHUBPILL_PER_SOURCE_LIMIT ?? 10,
      maxCandidates: env.GITHUBPILL_MAX_CANDIDATES ?? 8,
      concurrency: env.GITHUBPILL_CONCURRENCY ?? 4,
      requestTimeoutMs: env.GITHUBPILL_TIMEOUT_MS ?? 15_000,
      maxQueriesPerSource: env.GITHUBPILL_MAX_QUERIES ?? 6,
      maxTokens: env.GITHUBPILL_MAX_TOKENS ?? 4096,
    });
  } catch (error) {
    throw new ConfigError(`Invalid configuration: ${(error as Error).message}`);
  }

  const logLevel: LogLevel = isLogLevel(env.GITHUBPILL_LOG ?? "") ? (env.GITHUBPILL_LOG as LogLevel) : "info";

  const config: Config = {
    llm: {
      provider,
      apiKey,
      model: env.GITHUBPILL_MODEL || DEFAULT_MODELS[provider],
      maxTokens: limits.maxTokens,
      timeoutMs: limits.requestTimeoutMs,
      ...(env[BASE_URL_ENV[provider]] ? { baseUrl: env[BASE_URL_ENV[provider]] as string } : {}),
    },
    sources: resolveSources(env),
    perSourceLimit: limits.perSourceLimit,
    maxCandidates: limits.maxCandidates,
    concurrency: limits.concurrency,
    requestTimeoutMs: limits.requestTimeoutMs,
    maxQueriesPerSource: limits.maxQueriesPerSource,
    logLevel,
  };

  const githubToken = env.GITHUB_TOKEN || env.GH_TOKEN || (deps.ghToken ?? ghCliToken)();
  if (githubToken) config.githubToken = githubToken;

  return config;
}

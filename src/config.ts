import { execFileSync } from "node:child_process";

export interface Config {
  /** GitHub API token. Falls back to the `gh` CLI session when present. */
  githubToken?: string;
  /** Anthropic API key. Synthesis is skipped when absent. */
  anthropicApiKey?: string;
  model: string;
  /** Max results requested per source per query. */
  perSourceLimit: number;
  /** Max candidates carried into synthesis and the report. */
  maxCandidates: number;
  /** Max concurrent in-flight HTTP requests. */
  concurrency: number;
  requestTimeoutMs: number;
  /** Max queries dispatched to each source. */
  maxQueriesPerSource: number;
}

export const DEFAULT_MODEL = "claude-sonnet-4-5";

function envToken(env: NodeJS.ProcessEnv): string | undefined {
  return env.GITHUB_TOKEN || env.GH_TOKEN || undefined;
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const githubToken = envToken(env) ?? ghCliToken();
  const config: Config = {
    model: env.GITHUBPILL_MODEL || DEFAULT_MODEL,
    perSourceLimit: Number(env.GITHUBPILL_PER_SOURCE_LIMIT) || 10,
    maxCandidates: Number(env.GITHUBPILL_MAX_CANDIDATES) || 8,
    concurrency: Number(env.GITHUBPILL_CONCURRENCY) || 4,
    requestTimeoutMs: Number(env.GITHUBPILL_TIMEOUT_MS) || 15_000,
    maxQueriesPerSource: Number(env.GITHUBPILL_MAX_QUERIES) || 6,
  };
  if (githubToken) config.githubToken = githubToken;
  if (env.ANTHROPIC_API_KEY) config.anthropicApiKey = env.ANTHROPIC_API_KEY;
  return config;
}

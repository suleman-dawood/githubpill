import type { SourceId } from "../types.js";
import type { SourceAdapter } from "./types.js";
import { GitHubAdapter } from "./github.js";
import { NpmAdapter } from "./npm.js";
import { PyPiAdapter } from "./pypi.js";
import { HackerNewsAdapter } from "./hackernews.js";

export const ALL_SOURCES: readonly SourceId[] = ["github", "npm", "pypi", "hackernews"];

/**
 * The default adapter set. `GITHUBPILL_SOURCES=github,npm` narrows it, which
 * is useful for tests and for runs that only care about one ecosystem.
 */
export function defaultAdapters(env: NodeJS.ProcessEnv = process.env): SourceAdapter[] {
  const requested = (env.GITHUBPILL_SOURCES ?? ALL_SOURCES.join(","))
    .split(",")
    .map((id) => id.trim())
    .filter((id): id is SourceId => (ALL_SOURCES as readonly string[]).includes(id));
  const enabled = new Set(requested);

  return [new GitHubAdapter(), new NpmAdapter(), new PyPiAdapter(), new HackerNewsAdapter()].filter(
    (adapter) => enabled.has(adapter.id),
  );
}

export type { SourceAdapter, SearchOptions } from "./types.js";
export { queriesFor, verification } from "./types.js";

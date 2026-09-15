import type { SourceId } from "../types.js";
import type { SourceAdapter } from "./types.js";
import { GitHubAdapter } from "./github.js";
import { NpmAdapter } from "./npm.js";
import { PyPiAdapter } from "./pypi.js";
import { HackerNewsAdapter } from "./hackernews.js";

/**
 * Source registry. Adding a source means implementing `SourceAdapter` and
 * adding one entry here — nothing else in the pipeline changes.
 */
const FACTORIES: Record<SourceId, () => SourceAdapter> = {
  github: () => new GitHubAdapter(),
  npm: () => new NpmAdapter(),
  pypi: () => new PyPiAdapter(),
  hackernews: () => new HackerNewsAdapter(),
};

/** Build adapters for the requested sources, preserving the requested order. */
export function createAdapters(sources: readonly SourceId[]): SourceAdapter[] {
  return sources.map((source) => FACTORIES[source]());
}

export type { SearchOptions, SourceAdapter } from "./types.js";
export { queriesFor, verification } from "./types.js";

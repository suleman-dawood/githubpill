import type { ProgressHandler, QueryPlan, RawHit, SourceId, SourceRun } from "../types.js";
import type { Config } from "../config.js";
import { mapLimit } from "../adapters/http.js";
import { queriesFor, type SourceAdapter } from "../adapters/index.js";

export interface AdapterError {
  source: SourceId;
  query: string;
  message: string;
}

export interface FanoutResult {
  hits: RawHit[];
  runs: SourceRun[];
  errors: AdapterError[];
}

/**
 * Dispatch every (adapter, query) pair with bounded concurrency. A failing
 * query is recorded and skipped rather than failing the run, so one flaky
 * source cannot sink the whole search — the errors surface in the report.
 */
export async function fanout(
  adapters: readonly SourceAdapter[],
  plan: QueryPlan,
  config: Config,
  onProgress?: ProgressHandler,
  signal?: AbortSignal,
): Promise<FanoutResult> {
  const jobs = adapters.flatMap((adapter) =>
    queriesFor(plan, config.maxQueriesPerSource).map((query) => ({ adapter, query })),
  );

  const hits: RawHit[] = [];
  const runs: SourceRun[] = [];
  const errors: AdapterError[] = [];

  await mapLimit(jobs, config.concurrency, async ({ adapter, query }) => {
    try {
      const searchOptions = { limit: config.perSourceLimit, config, ...(signal ? { signal } : {}) };
      const results = await adapter.search(query, searchOptions);
      for (const hit of results) hits.push({ ...hit, query });
      runs.push({ source: adapter.id, query, hits: results.length });
      onProgress?.({ type: "search", source: adapter.id, query, hits: results.length });
    } catch (error) {
      errors.push({ source: adapter.id, query, message: (error as Error).message });
      runs.push({ source: adapter.id, query, hits: 0 });
      onProgress?.({ type: "search", source: adapter.id, query, hits: 0 });
    }
  });

  runs.sort((a, b) => a.source.localeCompare(b.source) || a.query.localeCompare(b.query));
  return { hits, runs, errors };
}

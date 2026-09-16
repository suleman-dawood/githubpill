import type { Candidate, QueryPlan, RawHit, SourceId, Verification } from "../types.js";
import type { Config } from "../config.js";
import { HttpError } from "../errors.js";

export interface SearchOptions {
  limit: number;
  config: Config;
  signal?: AbortSignal;
}

/**
 * A source of prior art. Implement `search` to fetch raw hits for one query
 * and `verify` to confirm a candidate still exists. Adding a source means
 * implementing this interface and registering it — nothing else changes.
 */
export interface SourceAdapter {
  readonly id: SourceId;
  readonly label: string;
  search(query: string, options: SearchOptions): Promise<RawHit[]>;
  verify(candidate: Candidate, options: SearchOptions): Promise<Verification>;
}

/** Build the ordered, de-duplicated list of queries an adapter should run. */
export function queriesFor(
  plan: Pick<QueryPlan, "keywords" | "productNames" | "topics">,
  max: number,
): string[] {
  const queries = [
    ...plan.keywords,
    ...plan.productNames,
    ...plan.topics.map((topic) => `topic:${topic}`),
  ];
  return [...new Set(queries.map((query) => query.trim()).filter(Boolean))].slice(0, max);
}

export function verification(
  ok: boolean,
  status: number | null,
  finalUrl?: string,
  error?: string,
): Verification {
  const result: Verification = { ok, status, checkedAt: new Date().toISOString() };
  if (finalUrl) result.finalUrl = finalUrl;
  if (error) result.error = error;
  return result;
}

/** Turn a failed `verify` call into a `Verification`, preserving the HTTP status. */
export function verificationFromError(error: unknown): Verification {
  if (error instanceof HttpError) {
    return verification(false, error.status, undefined, error.message);
  }
  return verification(false, null, undefined, error instanceof Error ? error.message : String(error));
}

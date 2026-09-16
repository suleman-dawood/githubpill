import type { Candidate, ProgressHandler, SourceId } from "../types.js";
import type { Config } from "../config.js";
import { mapLimit } from "../adapters/http.js";
import type { SourceAdapter } from "../adapters/index.js";

export interface VerifyResult {
  /** Candidates that passed, were not checked, or could not be checked. */
  candidates: Candidate[];
  /** Candidates the source reports as gone (404/410). */
  dropped: Candidate[];
  /** Candidates the check could not confirm (rate limit, 5xx, network). */
  unverified: Candidate[];
  checked: number;
  alive: number;
}

/** Statuses that mean the artifact is gone, as opposed to "could not check". */
const GONE_STATUSES = new Set([404, 410]);

/** The first source of this candidate that has a matching adapter. */
function adapterFor(
  candidate: Candidate,
  bySource: Map<SourceId, SourceAdapter>,
): SourceAdapter | undefined {
  for (const source of candidate.sources) {
    const adapter = bySource.get(source);
    if (adapter) return adapter;
  }
  return undefined;
}

/** True when the source definitively reports the candidate as gone (404/410). */
function isGone(candidate: Candidate): boolean {
  const status = candidate.verification?.status ?? null;
  return status !== null && GONE_STATUSES.has(status);
}

/**
 * Confirm candidates still exist at their source.
 *
 * Only a definitive "gone" (404/410) drops a candidate. A rate limit, server
 * error, or network failure is inconclusive: the candidate came from a live
 * search, so it is kept and marked unverified. Treating a 403 rate limit as
 * "does not exist" silently empties the result set.
 */
export async function verifyCandidates(
  candidates: readonly Candidate[],
  adapters: readonly SourceAdapter[],
  config: Config,
  onProgress?: ProgressHandler,
  signal?: AbortSignal,
): Promise<VerifyResult> {
  const bySource = new Map<SourceId, SourceAdapter>(adapters.map((adapter) => [adapter.id, adapter]));

  const results = await mapLimit(candidates, config.concurrency, async (candidate) => {
    const adapter = adapterFor(candidate, bySource);
    if (!adapter) return { candidate, ok: true, checked: false };

    const verification = await adapter.verify(candidate, {
      limit: config.perSourceLimit,
      config,
      ...(signal ? { signal } : {}),
    });
    onProgress?.({ type: "verify", url: candidate.url, ok: verification.ok, status: verification.status });
    return { candidate: { ...candidate, verification }, ok: verification.ok, checked: true };
  });

  const kept: Candidate[] = [];
  const dropped: Candidate[] = [];
  const unverified: Candidate[] = [];

  for (const result of results) {
    if (!result.checked || result.ok) {
      kept.push(result.candidate);
    } else if (isGone(result.candidate)) {
      dropped.push(result.candidate);
    } else {
      unverified.push(result.candidate);
      kept.push(result.candidate);
    }
  }

  return {
    candidates: kept,
    dropped,
    unverified,
    checked: results.filter((result) => result.checked).length,
    alive: kept.filter((candidate) => candidate.verification?.ok).length,
  };
}

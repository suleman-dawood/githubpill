import type { Candidate, ProgressHandler, SourceId } from "../types.js";
import type { Config } from "../config.js";
import { mapLimit } from "../adapters/http.js";
import type { SourceAdapter } from "../adapters/index.js";

export interface VerifyResult {
  /** Candidates that passed verification (or had no adapter to check with). */
  candidates: Candidate[];
  /** Candidates that failed verification and were dropped. */
  dropped: Candidate[];
  checked: number;
  alive: number;
}

/**
 * Confirm every candidate still exists at its source. A candidate that fails
 * verification is dropped from the run — this is the citation-integrity gate
 * that keeps dead links out of reports.
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
    const adapter = candidate.sources.map((source) => bySource.get(source)).find(Boolean);
    if (!adapter) return { candidate, ok: true, checked: false };

    const verification = await adapter.verify(candidate, {
      limit: config.perSourceLimit,
      config,
      ...(signal ? { signal } : {}),
    });
    onProgress?.({ type: "verify", url: candidate.url, ok: verification.ok });
    return { candidate: { ...candidate, verification }, ok: verification.ok, checked: true };
  });

  const kept = results.filter((result) => result.ok).map((result) => result.candidate);
  const dropped = results.filter((result) => !result.ok).map((result) => result.candidate);

  return {
    candidates: kept,
    dropped,
    checked: results.filter((result) => result.checked).length,
    alive: kept.filter((candidate) => candidate.verification?.ok).length,
  };
}

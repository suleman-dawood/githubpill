import type { Candidate, RawHit, SourceId } from "../types.js";

interface Accumulator {
  id: string;
  name: string;
  url: string;
  description: string;
  sources: Set<SourceId>;
  queries: Set<string>;
  rankBonus: number;
  stars: number;
  language?: string;
  lastActivity?: string;
  archived: boolean;
}

/**
 * Canonical identity for dedupe. Different sources that point at the same
 * artifact (a GitHub repo surfaced by both GitHub search and a Hacker News
 * story) collapse to one candidate; unrelated hosts stay separate.
 */
function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "").replace(/\.git$/i, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Dedupe key: the canonical URL, or a source-scoped id when the URL is unusable. */
function groupKey(hit: RawHit): string {
  return canonicalUrl(hit.url) || `${hit.source}:${hit.id.toLowerCase()}`;
}

function emptyGroup(hit: RawHit): Accumulator {
  return {
    id: hit.id,
    name: hit.name,
    url: hit.url,
    description: hit.description,
    sources: new Set(),
    queries: new Set(),
    rankBonus: 0,
    stars: 0,
    archived: false,
  };
}

/** Fold one hit into its group, widening the merged provenance. */
function mergeHit(group: Accumulator, hit: RawHit): void {
  group.sources.add(hit.source);
  if (hit.query) group.queries.add(hit.query);
  group.rankBonus += 1 / (hit.rank + 1);
  if (hit.stars && hit.stars > group.stars) group.stars = hit.stars;
  if (!group.description && hit.description) group.description = hit.description;
  if (!group.language && hit.language) group.language = hit.language;
  if (hit.lastActivity && (!group.lastActivity || hit.lastActivity > group.lastActivity)) {
    group.lastActivity = hit.lastActivity;
  }
  if (hit.archived) group.archived = true;
}

/**
 * score = 3·(distinct sources) + 2·(distinct queries) + Σ 1/(rank+1) + log10(stars+1)
 *
 * Source and query agreement dominate because a candidate surfaced by several
 * independent searches is a stronger signal than one that merely ranked high
 * in a single query. Stars only break ties.
 */
function scoreOf(group: Accumulator): number {
  return 3 * group.sources.size + 2 * group.queries.size + group.rankBonus + Math.log10(group.stars + 1);
}

function toCandidate(group: Accumulator): Candidate {
  const candidate: Candidate = {
    id: group.id,
    name: group.name,
    url: group.url,
    description: group.description,
    sources: [...group.sources].sort(),
    matchedQueries: [...group.queries].sort(),
    score: scoreOf(group),
    archived: group.archived,
  };
  if (group.stars) candidate.stars = group.stars;
  if (group.language) candidate.language = group.language;
  if (group.lastActivity) candidate.lastActivity = group.lastActivity;
  return candidate;
}

/** Dedupe hits by canonical URL, merge their provenance, score, and cap them. */
export function rankCandidates(hits: readonly RawHit[], maxCandidates: number): Candidate[] {
  const groups = new Map<string, Accumulator>();

  for (const hit of hits) {
    const key = groupKey(hit);
    let group = groups.get(key);
    if (!group) {
      group = emptyGroup(hit);
      groups.set(key, group);
    }
    mergeHit(group, hit);
  }

  const candidates = [...groups.values()].map(toCandidate);
  candidates.sort(
    (a, b) => b.score - a.score || (b.stars ?? 0) - (a.stars ?? 0) || a.name.localeCompare(b.name),
  );
  return candidates.slice(0, maxCandidates);
}

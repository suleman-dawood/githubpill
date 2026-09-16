import type { Candidate, RawHit, SourceId, Verification } from "../types.js";
import { verification, verificationFromError, type SearchOptions, type SourceAdapter } from "./types.js";
import { getJson } from "./http.js";

const API = "https://hn.algolia.com/api/v1";

interface SearchResponse {
  hits?: Array<{
    objectID: string;
    title: string | null;
    url: string | null;
    points: number | null;
    created_at: string | null;
    num_comments: number | null;
  }>;
}

function itemUrl(id: string): string {
  return `https://news.ycombinator.com/item?id=${id}`;
}

export class HackerNewsAdapter implements SourceAdapter {
  readonly id: SourceId = "hackernews";
  readonly label = "Hacker News";

  async search(query: string, options: SearchOptions): Promise<RawHit[]> {
    const url = `${API}/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${options.limit}`;
    const data = await getJson<SearchResponse>(url, {
      timeoutMs: options.config.requestTimeoutMs,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return (data.hits ?? []).map((hit, rank): RawHit => {
      const result: RawHit = {
        source: this.id,
        id: hit.objectID,
        name: hit.title ?? `HN item ${hit.objectID}`,
        url: hit.url ?? itemUrl(hit.objectID),
        description: hit.title ?? "",
        rank,
      };
      if (typeof hit.points === "number") result.stars = hit.points;
      if (hit.created_at) result.lastActivity = hit.created_at;
      return result;
    });
  }

  async verify(candidate: Candidate, options: SearchOptions): Promise<Verification> {
    const url = `${API}/items/${candidate.id}`;
    try {
      const response = await getJson<{ id?: number }>(url, {
        timeoutMs: options.config.requestTimeoutMs,
        retries: 1,
      });
      return verification(Boolean(response.id), 200, itemUrl(candidate.id));
    } catch (error) {
      return verificationFromError(error);
    }
  }
}

import type { Candidate, RawHit, SourceId, Verification } from "../types.js";
import { verification, verificationFromError, type SearchOptions, type SourceAdapter } from "./types.js";
import { getJson, httpGet } from "./http.js";

const API = "https://registry.npmjs.org";

interface SearchResponse {
  objects?: Array<{
    package: {
      name: string;
      description?: string;
      date?: string;
      links?: { npm?: string };
    };
    score?: { final?: number };
  }>;
}

export class NpmAdapter implements SourceAdapter {
  readonly id: SourceId = "npm";
  readonly label = "npm";

  async search(query: string, options: SearchOptions): Promise<RawHit[]> {
    const url = `${API}/-/v1/search?text=${encodeURIComponent(query)}&size=${options.limit}`;
    const data = await getJson<SearchResponse>(url, {
      timeoutMs: options.config.requestTimeoutMs,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return (data.objects ?? []).map((entry, rank): RawHit => {
      const hit: RawHit = {
        source: this.id,
        id: entry.package.name,
        name: entry.package.name,
        url: entry.package.links?.npm ?? `https://www.npmjs.com/package/${entry.package.name}`,
        description: entry.package.description ?? "",
        rank,
      };
      if (entry.package.date) hit.lastActivity = entry.package.date;
      return hit;
    });
  }

  async verify(candidate: Candidate, options: SearchOptions): Promise<Verification> {
    const url = `${API}/${candidate.id}/latest`;
    try {
      const response = await httpGet(url, {
        timeoutMs: options.config.requestTimeoutMs,
        retries: 1,
      });
      return verification(response.ok, response.status, response.finalUrl);
    } catch (error) {
      return verificationFromError(error);
    }
  }
}

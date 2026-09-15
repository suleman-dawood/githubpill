import type { Candidate, RawHit, SourceId, Verification } from "../types.js";
import { verification, type SearchOptions, type SourceAdapter } from "./types.js";
import { getJson, httpGet } from "./http.js";
import { HttpError } from "../errors.js";

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
    return (data.objects ?? []).map((object, rank): RawHit => {
      const hit: RawHit = {
        source: this.id,
        id: object.package.name,
        name: object.package.name,
        url: object.package.links?.npm ?? `https://www.npmjs.com/package/${object.package.name}`,
        description: object.package.description ?? "",
        rank,
      };
      if (object.package.date) hit.lastActivity = object.package.date;
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
      if (error instanceof HttpError) {
        return verification(false, error.status, undefined, error.message);
      }
      return verification(false, null, undefined, (error as Error).message);
    }
  }
}

import type { Candidate, RawHit, SourceId, Verification } from "../types.js";
import { verification, type SearchOptions, type SourceAdapter } from "./types.js";
import { getJson } from "./http.js";
import { HttpError } from "../errors.js";

const API = "https://api.github.com";

interface SearchResponse {
  items?: Array<{
    full_name: string;
    html_url: string;
    description: string | null;
    stargazers_count: number;
    language: string | null;
    pushed_at: string | null;
    archived: boolean;
  }>;
}

interface RepoResponse {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  pushed_at: string | null;
  archived: boolean;
}

function headers(token?: string): Record<string, string> {
  const result: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
  if (token) result.authorization = `Bearer ${token}`;
  return result;
}

/** GitHub repo search qualifies bare terms; topic: queries pass through. */
function toQuery(query: string): string {
  return query.startsWith("topic:") ? query : `${query} in:name,description`;
}

function toHit(item: NonNullable<SearchResponse["items"]>[number], source: SourceId, rank: number): RawHit {
  const hit: RawHit = {
    source,
    id: item.full_name,
    name: item.full_name,
    url: item.html_url,
    description: item.description ?? "",
    rank,
    stars: item.stargazers_count,
    archived: item.archived,
  };
  if (item.language) hit.language = item.language;
  if (item.pushed_at) hit.lastActivity = item.pushed_at;
  return hit;
}

export class GitHubAdapter implements SourceAdapter {
  readonly id: SourceId = "github";
  readonly label = "GitHub";

  async search(query: string, options: SearchOptions): Promise<RawHit[]> {
    const url = `${API}/search/repositories?q=${encodeURIComponent(toQuery(query))}&per_page=${options.limit}`;
    const data = await getJson<SearchResponse>(url, {
      headers: headers(options.config.githubToken),
      timeoutMs: options.config.requestTimeoutMs,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return (data.items ?? []).map((item, rank) => toHit(item, this.id, rank));
  }

  async verify(candidate: Candidate, options: SearchOptions): Promise<Verification> {
    const url = `${API}/repos/${candidate.id}`;
    try {
      const data = await getJson<RepoResponse>(url, {
        headers: headers(options.config.githubToken),
        timeoutMs: options.config.requestTimeoutMs,
        retries: 1,
      });
      return verification(true, 200, data.html_url);
    } catch (error) {
      if (error instanceof HttpError) {
        return verification(false, error.status, undefined, error.message);
      }
      return verification(false, null, undefined, (error as Error).message);
    }
  }
}

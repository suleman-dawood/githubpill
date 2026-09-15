import type { Candidate, RawHit, SourceId, Verification } from "../types.js";
import { verification, type SearchOptions, type SourceAdapter } from "./types.js";
import { httpGet } from "./http.js";
import { HttpError } from "../errors.js";

const API = "https://pypi.org";

/**
 * PyPI has no JSON search API, so this adapter reads the public search page.
 * The parser is deliberately isolated in `parseSnippets` — if PyPI changes its
 * markup, only that function needs updating.
 */
export function parseSnippets(html: string): Array<{ name: string; description: string }> {
  const results: Array<{ name: string; description: string }> = [];
  const blocks = html.matchAll(/<a[^>]*class="[^"]*package-snippet[^"]*"[^>]*href="\/project\/([^/"]+)\/"[^>]*>([\s\S]*?)<\/a>/g);
  for (const block of blocks) {
    const fallbackName = block[1] ?? "";
    const inner = block[2] ?? "";
    const name = inner.match(/package-snippet__name[^>]*>([^<]+)</)?.[1]?.trim() ?? fallbackName;
    const description = inner.match(/package-snippet__description[^>]*>([^<]*)</)?.[1]?.trim() ?? "";
    if (name) results.push({ name, description });
  }
  return results;
}

export class PyPiAdapter implements SourceAdapter {
  readonly id: SourceId = "pypi";
  readonly label = "PyPI";

  async search(query: string, options: SearchOptions): Promise<RawHit[]> {
    const url = `${API}/search/?q=${encodeURIComponent(query)}`;
    const response = await httpGet(url, {
      headers: { accept: "text/html" },
      timeoutMs: options.config.requestTimeoutMs,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (!response.ok) return [];
    return parseSnippets(response.text)
      .slice(0, options.limit)
      .map((snippet, rank): RawHit => ({
        source: this.id,
        id: snippet.name,
        name: snippet.name,
        url: `${API}/project/${snippet.name}/`,
        description: snippet.description,
        rank,
      }));
  }

  async verify(candidate: Candidate, options: SearchOptions): Promise<Verification> {
    const url = `${API}/pypi/${candidate.id}/json`;
    try {
      const response = await httpGet(url, {
        headers: { accept: "application/json" },
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

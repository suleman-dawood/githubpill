import * as cheerio from "cheerio";
import type { Candidate, RawHit, SourceId, Verification } from "../types.js";
import { verification, verificationFromError, type SearchOptions, type SourceAdapter } from "./types.js";
import { httpGet } from "./http.js";

const API = "https://pypi.org";

/**
 * PyPI has no JSON search API, so this adapter reads the public search page.
 * The parser is deliberately isolated in `parseSnippets` — if PyPI changes its
 * markup, only that function needs updating.
 */
export function parseSnippets(html: string): Array<{ name: string; description: string }> {
  const $ = cheerio.load(html);
  const results: Array<{ name: string; description: string }> = [];

  $("a.package-snippet").each((_, element) => {
    const anchor = $(element);
    const fromMarkup = anchor.find(".package-snippet__name").text().trim();
    const fromHref = anchor.attr("href")?.match(/\/project\/([^/]+)\//)?.[1] ?? "";
    const name = fromMarkup || fromHref;
    const description = anchor.find(".package-snippet__description").text().trim();
    if (name) results.push({ name, description });
  });

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
      return verificationFromError(error);
    }
  }
}

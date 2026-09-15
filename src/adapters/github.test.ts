import { describe, expect, it, vi } from "vitest";
import { GitHubAdapter } from "./github.js";
import { jsonResponse, testConfig } from "../testing/fakes.js";
import type { Candidate } from "../types.js";

const config = testConfig();
const candidate: Candidate = {
  id: "a/b",
  name: "a/b",
  url: "https://github.com/a/b",
  description: "",
  sources: ["github"],
  matchedQueries: [],
  score: 1,
};

describe("GitHubAdapter", () => {
  it("qualifies keyword queries and maps items", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        items: [
          {
            full_name: "a/b",
            html_url: "https://github.com/a/b",
            description: "a diff viewer",
            stargazers_count: 5,
            language: "Go",
            pushed_at: "2026-01-01T00:00:00Z",
            archived: false,
          },
        ],
      }),
    );

    const hits = await new GitHubAdapter().search("todo cli", { limit: 5, config });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("in%3Aname%2Cdescription");
    expect(url).toContain("per_page=5");
    expect(hits[0]).toMatchObject({
      id: "a/b",
      stars: 5,
      language: "Go",
      rank: 0,
      source: "github",
    });
  });

  it("passes topic queries through unqualified", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ items: [] }));
    await new GitHubAdapter().search("topic:tui", { limit: 5, config });
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("q=topic%3Atui");
    expect(url).not.toContain("in%3Aname");
  });

  it("sends an auth header when a token is configured", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ items: [] }));
    await new GitHubAdapter().search("x", { limit: 5, config: testConfig({ githubToken: "secret" }) });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret");
  });

  it("verifies a repo and reports 404s as not ok", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(jsonResponse({ html_url: "https://github.com/a/b" }));
    const ok = await new GitHubAdapter().verify(candidate, { limit: 5, config });
    expect(ok.ok).toBe(true);
    expect(ok.status).toBe(200);

    fetchMock.mockResolvedValueOnce(new Response("not found", { status: 404 }));
    const missing = await new GitHubAdapter().verify(candidate, { limit: 5, config });
    expect(missing.ok).toBe(false);
    expect(missing.status).toBe(404);
  });
});

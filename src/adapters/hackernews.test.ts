import { describe, expect, it, vi } from "vitest";
import { HackerNewsAdapter } from "./hackernews.js";
import { jsonResponse, testConfig } from "../testing/fakes.js";

const config = testConfig();

describe("HackerNewsAdapter", () => {
  it("maps stories, falling back to the discussion URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        hits: [
          {
            objectID: "1",
            title: "Show HN: Diff viewer",
            url: "https://example.com/diff",
            points: 120,
            created_at: "2026-02-01T00:00:00Z",
            num_comments: 30,
          },
          { objectID: "2", title: "Ask HN", url: null, points: 5, created_at: null, num_comments: 0 },
        ],
      }),
    );

    const hits = await new HackerNewsAdapter().search("diff viewer", { limit: 5, config });

    expect(hits[0]).toMatchObject({ id: "1", url: "https://example.com/diff", stars: 120, rank: 0 });
    expect(hits[1]?.url).toBe("https://news.ycombinator.com/item?id=2");
  });
});

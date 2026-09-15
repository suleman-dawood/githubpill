import { describe, expect, it } from "vitest";
import { rankCandidates } from "./rank.js";
import { hit } from "../testing/fakes.js";

describe("rankCandidates", () => {
  it("dedupes by source and id, merging provenance", () => {
    const ranked = rankCandidates(
      [
        hit({ id: "a/b", query: "q1", rank: 0 }),
        hit({ id: "a/b", query: "q2", rank: 3 }),
        hit({ id: "c/d", query: "q1", rank: 1 }),
      ],
      10,
    );
    expect(ranked).toHaveLength(2);
    const ab = ranked.find((candidate) => candidate.id === "a/b");
    expect(ab?.matchedQueries).toEqual(["q1", "q2"]);
    expect(ab?.sources).toEqual(["github"]);
  });

  it("ranks candidates surfaced by more sources and queries first", () => {
    const ranked = rankCandidates(
      [
        hit({ id: "strong/one", query: "q1", rank: 0 }),
        hit({ id: "strong/one", query: "q2", rank: 0, source: "npm" }),
        hit({ id: "weak/one", query: "q1", rank: 0 }),
      ],
      10,
    );
    expect(ranked[0]?.id).toBe("strong/one");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it("caps the result set", () => {
    const hits = Array.from({ length: 10 }, (_, i) => hit({ id: `owner/repo${i}`, query: "q" }));
    expect(rankCandidates(hits, 3)).toHaveLength(3);
  });

  it("merges stars and keeps the latest activity", () => {
    const ranked = rankCandidates(
      [
        hit({ id: "a/b", query: "q1", stars: 5, lastActivity: "2025-01-01T00:00:00Z" }),
        hit({ id: "a/b", query: "q2", stars: 50, lastActivity: "2026-01-01T00:00:00Z" }),
      ],
      10,
    );
    expect(ranked[0]?.stars).toBe(50);
    expect(ranked[0]?.lastActivity).toBe("2026-01-01T00:00:00Z");
  });
});

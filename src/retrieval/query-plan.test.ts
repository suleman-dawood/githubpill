import { describe, expect, it } from "vitest";
import { extractPreservedTerms, extractProductNames, planQueries } from "./query-plan.js";

describe("planQueries", () => {
  it("preserves acronyms and hyphenated jargon", () => {
    const plan = planQueries(
      "An NDIS invoice validator for Australian healthcare providers using rust-analyzer",
    );
    expect(plan.preservedTerms).toContain("NDIS");
    expect(plan.preservedTerms).toContain("rust-analyzer");
    expect(plan.sharpened).toContain("NDIS");
  });

  it("keeps quoted phrases intact", () => {
    expect(extractPreservedTerms('a tool called "Smart Connections" for notes')).toContain(
      "Smart Connections",
    );
  });

  it("detects mid-sentence product names", () => {
    const names = extractProductNames("I want to build something like PeerTube but for audio", []);
    expect(names).toContain("PeerTube");
  });

  it("produces keyword phrases and topic tags", () => {
    const plan = planQueries("A CLI that previews diffs as a side-by-side TUI");
    expect(plan.keywords.length).toBeGreaterThan(0);
    expect(plan.topics.length).toBeGreaterThan(0);
    expect(plan.keywords.every((keyword) => keyword.length <= 120)).toBe(true);
  });

  it("truncates the sharpened sentence", () => {
    const plan = planQueries(`${"word ".repeat(100)}end`);
    expect(plan.sharpened.length).toBeLessThanOrEqual(200);
  });
});

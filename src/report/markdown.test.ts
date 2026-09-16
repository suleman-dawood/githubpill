import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Report, ReportCandidate } from "../types.js";

function candidate(overrides: Partial<ReportCandidate> = {}): ReportCandidate {
  return {
    id: "acme/diff",
    name: "acme/diff",
    url: "https://github.com/acme/diff",
    description: "a side-by-side diff viewer",
    sources: ["github"],
    label: "LIKELY_MATCH",
    axisScores: { coreFunction: 3, targetAudience: 2, scope: 2, approach: 2, activity: 3 },
    axisSum: 12,
    rationale: "same core problem",
    verifiedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function report(overrides: Partial<Report> = {}): Report {
  return {
    idea: "a diff viewer",
    sharpened: "a side-by-side diff viewer",
    preservedTerms: [],
    band: "red",
    headline: "This already exists — 1 strong match found",
    summary: "A close project exists.",
    candidates: [candidate()],
    yourAngle: { summary: "focus on speed", missingFeatures: ["faster rendering"] },
    sourceRuns: [{ source: "github", query: "diff viewer", hits: 3 }],
    stats: {
      durationMs: 1234,
      queriesRun: 2,
      hitsFound: 5,
      candidatesConsidered: 4,
      candidatesReported: 1,
      citationsChecked: 1,
      citationsAlive: 1,
    },
    generatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("renderMarkdown header", () => {
  it("picks the badge for each band", () => {
    expect(renderMarkdown(report({ band: "green", headline: "novel" }))).toContain("# 🟢 novel");
    expect(renderMarkdown(report({ band: "yellow", headline: "overlap" }))).toContain("# 🟡 overlap");
    expect(renderMarkdown(report({ band: "red", headline: "exists" }))).toContain("# 🔴 exists");
  });

  it("renders the sharpened idea and summary", () => {
    const markdown = renderMarkdown(report());
    expect(markdown).toContain("> **Your idea:** a side-by-side diff viewer");
    expect(markdown).toContain("A close project exists.");
    expect(markdown).toContain("## What exists today");
  });
});

describe("renderMarkdown candidate block", () => {
  it("renders name, label, url, sources, and rationale", () => {
    const markdown = renderMarkdown(report());
    expect(markdown).toContain("### acme/diff — LIKELY_MATCH");
    expect(markdown).toContain("[acme/diff](https://github.com/acme/diff) — verified 2026-01-01T00:00:00.000Z");
    expect(markdown).toContain("**Sources:** github");
    expect(markdown).toContain("**What it does:** a side-by-side diff viewer");
    expect(markdown).toContain("**Overlap:** same core problem");
  });

  it("marks a candidate with no verification as unverified", () => {
    const markdown = renderMarkdown(report({ candidates: [candidate({ verifiedAt: undefined })] }));
    expect(markdown).toContain("— unverified");
    expect(markdown).not.toContain("— verified");
  });

  it("renders the axis score line", () => {
    expect(renderMarkdown(report())).toContain(
      "**Axis scores:** core_function=3 target_audience=2 scope=2 approach=2 activity=3 (sum=12)",
    );
  });

  it("renders every optional fact, joined by middot", () => {
    const markdown = renderMarkdown(
      report({
        candidates: [
          candidate({ stars: 1234567, language: "Go", lastActivity: "2026-02-01", archived: true }),
        ],
      }),
    );
    expect(markdown).toContain(
      `**Stars:** ${(1234567).toLocaleString()} · **Language:** Go · **Last activity:** 2026-02-01 · **Archived**`,
    );
  });

  it("omits the description and fact lines when the data is absent", () => {
    const markdown = renderMarkdown(
      report({ candidates: [candidate({ description: "", stars: undefined })] }),
    );
    expect(markdown).not.toContain("**What it does:**");
    expect(markdown).not.toContain("**Stars:**");
    expect(markdown).not.toContain("**Language:**");
    expect(markdown).not.toContain("**Last activity:**");
    expect(markdown).not.toContain("**Archived**");
  });

  it("renders clone evidence when present", () => {
    const markdown = renderMarkdown(
      report({
        candidates: [
          candidate({ evidence: [{ path: "src/main.ts", line: 3, note: "entry point" }] }),
        ],
      }),
    );
    expect(markdown).toContain("**Evidence from the clone:**");
    expect(markdown).toContain("- `src/main.ts:3` — entry point");
  });

  it("omits the evidence section when empty", () => {
    expect(renderMarkdown(report({ candidates: [candidate({ evidence: [] })] }))).not.toContain(
      "**Evidence from the clone:**",
    );
  });

  it("joins multiple candidates with a blank line", () => {
    const markdown = renderMarkdown(
      report({ candidates: [candidate({ id: "a/b", name: "a/b" }), candidate({ id: "c/d", name: "c/d" })] }),
    );
    expect(markdown).toContain("### a/b — LIKELY_MATCH");
    expect(markdown).toContain("### c/d — LIKELY_MATCH");
  });
});

describe("renderMarkdown your-angle section", () => {
  it("lists missing features as bullets", () => {
    const markdown = renderMarkdown(
      report({ yourAngle: { summary: "angle", missingFeatures: ["faster", "offline"] } }),
    );
    expect(markdown).toContain("## What's missing — your angle");
    expect(markdown).toContain("- faster\n- offline");
  });

  it("uses the overlap fallback when there are no missing features", () => {
    const markdown = renderMarkdown(report({ yourAngle: { summary: "angle", missingFeatures: [] } }));
    expect(markdown).toContain(
      "_No distinguishing features identified — your idea overlaps fully with existing candidates._",
    );
  });
});

describe("renderMarkdown empty report", () => {
  it("renders the no-candidates placeholder and (none) labels", () => {
    const markdown = renderMarkdown(report({ candidates: [], band: "green", headline: "novel" }));
    expect(markdown).toContain("_No candidate projects were retrieved._");
    expect(markdown).toContain("- Labels: (none)");
  });
});

describe("renderMarkdown run metadata", () => {
  it("lists preserved terms", () => {
    expect(renderMarkdown(report({ preservedTerms: ["NDIS", "rust-analyzer"] }))).toContain(
      "- Preserved terms: NDIS, rust-analyzer",
    );
  });

  it("falls back to (none) when there are no preserved terms", () => {
    expect(renderMarkdown(report({ preservedTerms: [] }))).toContain("- Preserved terms: (none)");
  });

  it("dedupes the queried sources", () => {
    const markdown = renderMarkdown(
      report({
        sourceRuns: [
          { source: "github", query: "q1", hits: 1 },
          { source: "github", query: "q2", hits: 2 },
          { source: "npm", query: "q3", hits: 3 },
        ],
      }),
    );
    expect(markdown).toContain("- Sources queried: github, npm");
  });

  it("formats the duration in seconds", () => {
    expect(renderMarkdown(report({ stats: { ...report().stats, durationMs: 1234 } }))).toContain(
      "- Duration: 1.2s",
    );
  });

  it("dedupes labels in insertion order", () => {
    const markdown = renderMarkdown(
      report({
        candidates: [
          candidate({ id: "a/b", label: "LIKELY_MATCH" }),
          candidate({ id: "c/d", label: "UNRELATED" }),
          candidate({ id: "e/f", label: "LIKELY_MATCH" }),
        ],
      }),
    );
    expect(markdown).toContain("- Labels: LIKELY_MATCH, UNRELATED");
  });

  it("reports citation counts", () => {
    expect(renderMarkdown(report())).toContain("- Citations verified: 1/1");
  });
});

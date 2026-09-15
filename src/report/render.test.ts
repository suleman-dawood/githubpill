import { describe, expect, it } from "vitest";
import { renderHtml } from "./html.js";
import { renderJson } from "./json.js";
import { renderMarkdown } from "./markdown.js";
import { validate } from "../validate.js";
import { FakeAdapter, FakeLLM, hit, testConfig } from "../testing/fakes.js";
import type { Report } from "../types.js";

async function sampleReport(): Promise<Report> {
  const adapter = new FakeAdapter({
    hits: [hit({ id: "acme/diff", description: "side-by-side <diff> viewer", stars: 42 })],
  });
  const llm = new FakeLLM({
    prior_art_analysis: {
      summary: "A close project exists.",
      candidates: [
        {
          candidateId: "acme/diff",
          axisScores: { coreFunction: 3, targetAudience: 2, scope: 2, approach: 2, activity: 3 },
          rationale: "same core problem",
        },
      ],
      yourAngle: { summary: "angle", missingFeatures: ["faster rendering"] },
    },
  });
  const { report } = await validate({ idea: "a diff viewer", llm, config: testConfig(), adapters: [adapter] });
  return report;
}

describe("report renderers", () => {
  it("renders JSON that round-trips", async () => {
    const report = await sampleReport();
    const parsed = JSON.parse(renderJson(report)) as Report;
    expect(parsed.band).toBe(report.band);
    expect(parsed.candidates).toHaveLength(report.candidates.length);
  });

  it("renders markdown with a badge and verification timestamp", async () => {
    const markdown = renderMarkdown(await sampleReport());
    expect(markdown).toContain("🔴");
    expect(markdown).toContain("verified");
    expect(markdown).toContain("acme/diff");
    expect(markdown).toContain("What's missing — your angle");
  });

  it("renders HTML and escapes upstream descriptions", async () => {
    const html = renderHtml(await sampleReport());
    expect(html).toContain("https://github.com/acme/diff");
    expect(html).toContain("side-by-side &lt;diff&gt; viewer");
    expect(html).toContain("verified");
  });

  it("renders deep-mode file evidence in both formats", async () => {
    const report = await sampleReport();
    const deep: Report = {
      ...report,
      depth: "deep",
      candidates: report.candidates.map((candidate) => ({
        ...candidate,
        inspected: true,
        evidence: [{ path: "src/main.ts", line: 3, note: "entry point" }],
      })),
    };

    expect(renderMarkdown(deep)).toContain("src/main.ts:3");
    expect(renderHtml(deep)).toContain("src/main.ts:3");
  });
});

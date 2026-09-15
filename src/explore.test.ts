import { describe, expect, it } from "vitest";
import { explore } from "./explore.js";
import { FakeAdapter, FakeLLM, hit, testConfig } from "./testing/fakes.js";

function llmWith(overrides: Partial<{ clusters: unknown[]; gaps: unknown[]; directions: unknown[] }> = {}) {
  return new FakeLLM({
    exploration: {
      summary: "A crowded space.",
      clusters: overrides.clusters ?? [
        { theme: "TUIs", summary: "Terminal managers.", candidateIds: ["a/b"] },
      ],
      gaps: overrides.gaps ?? [{ observation: "None is Rust-based.", candidateIds: ["a/b"] }],
      directions: overrides.directions ?? [
        { idea: "A Rust TUI file manager", why: "All are C or Go.", groundedIn: ["a/b"] },
      ],
    },
  });
}

describe("explore", () => {
  it("produces a landscape report from retrieved candidates", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b", description: "tui file manager", stars: 10 })] });

    const { report } = await explore({
      topic: "terminal file manager",
      llm: llmWith(),
      config: testConfig(),
      adapters: [adapter],
    });

    expect(report.clusters).toHaveLength(1);
    expect(report.directions[0]?.groundedIn).toEqual(["a/b"]);
    expect(report.candidates[0]?.verifiedAt).toBeTruthy();
    expect(report.stats.candidatesReported).toBe(1);
  });

  it("drops clusters and directions grounded only in unknown ids", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b" })] });

    const { report } = await explore({
      topic: "terminal file manager",
      llm: llmWith({
        clusters: [{ theme: "x", summary: "y", candidateIds: ["ghost/repo"] }],
        directions: [{ idea: "i", why: "w", groundedIn: ["ghost/repo"] }],
      }),
      config: testConfig(),
      adapters: [adapter],
    });

    expect(report.clusters).toHaveLength(0);
    expect(report.directions).toHaveLength(0);
  });
});

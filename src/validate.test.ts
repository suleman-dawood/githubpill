import { describe, expect, it } from "vitest";
import { validate } from "./validate.js";
import { FakeAdapter, FakeLLM, hit, testConfig } from "./testing/fakes.js";
import type { ProgressEvent } from "./types.js";

const LIKELY = { coreFunction: 3, targetAudience: 3, scope: 3, approach: 2, activity: 3 };

function llmFor(candidateId: string): FakeLLM {
  return new FakeLLM({
    prior_art_analysis: {
      summary: "prior art exists",
      candidates: [{ candidateId, axisScores: LIKELY, rationale: "same problem" }],
      yourAngle: { summary: "your angle", missingFeatures: ["do better"] },
    },
  });
}

describe("run", () => {
  it("runs end to end and derives a red verdict", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b", description: "todo cli", stars: 10 })] });
    const { report } = await validate({
      idea: "a todo cli",
      llm: llmFor("a/b"),
      config: testConfig(),
      adapters: [adapter],
    });

    expect(report.band).toBe("red");
    expect(report.candidates[0]?.label).toBe("LIKELY_MATCH");
    expect(report.candidates[0]?.verifiedAt).toBeTruthy();
    expect(report.stats.citationsAlive).toBe(1);
    expect(report.stats.queriesRun).toBeGreaterThan(0);
    expect(report.headline).toContain("exists");
  });

  it("drops candidates that fail verification and stays green", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b" })], verifyOk: false });
    const { report, dropped } = await validate({
      idea: "a todo cli",
      llm: llmFor("a/b"),
      config: testConfig(),
      adapters: [adapter],
    });

    expect(report.candidates).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(report.band).toBe("green");
  });

  it("emits progress events across the pipeline", async () => {
    const events: ProgressEvent["type"][] = [];
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b" })] });
    await validate({
      idea: "a todo cli",
      llm: llmFor("a/b"),
      config: testConfig(),
      adapters: [adapter],
      onProgress: (event) => events.push(event.type),
    });

    expect(events).toContain("stage");
    expect(events).toContain("search");
    expect(events).toContain("verify");
    expect(events).toContain("done");
  });
});

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { validate } from "./validate.js";
import { FakeAdapter, FakeLLM, hit, testConfig } from "./testing/fakes.js";
import type { Cloner } from "./deep/clone.js";
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

const tmpDirs: string[] = [];
afterAll(() => Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true }))));

const cloner: Cloner = {
  async clone() {
    const root = await mkdtemp(join(tmpdir(), "ghp-validate-"));
    tmpDirs.push(root);
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "main.ts"), "a\nb\nc\n");
    return root;
  },
};

describe("validate", () => {
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

  it("keeps candidates when verification is rate-limited", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b" })], verifyStatus: 403 });

    const { report, unverified } = await validate({
      idea: "a todo cli",
      llm: llmFor("a/b"),
      config: testConfig(),
      adapters: [adapter],
    });

    expect(report.candidates).toHaveLength(1);
    expect(unverified).toHaveLength(1);
    expect(report.stats.citationsUnverified).toBe(1);
  });

  it("orders candidates by overlap, not retrieval rank", async () => {
    // low/one wins retrieval (100 stars) but overlaps less; high/two must lead.
    const adapter = new FakeAdapter({
      hits: [hit({ id: "low/one", stars: 100 }), hit({ id: "high/two", stars: 1 })],
    });
    const llm = new FakeLLM({
      prior_art_analysis: {
        summary: "s",
        candidates: [
          {
            candidateId: "low/one",
            axisScores: { coreFunction: 1, targetAudience: 1, scope: 1, approach: 1, activity: 1 },
            rationale: "low",
          },
          {
            candidateId: "high/two",
            axisScores: { coreFunction: 3, targetAudience: 3, scope: 3, approach: 2, activity: 3 },
            rationale: "high",
          },
        ],
        yourAngle: { summary: "y", missingFeatures: [] },
      },
    });

    const { report } = await validate({
      idea: "a todo cli",
      llm,
      config: testConfig(),
      adapters: [adapter],
    });

    expect(report.candidates.map((candidate) => candidate.id)).toEqual(["high/two", "low/one"]);
  });

  it("deep mode replaces the judgement with file evidence", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b", description: "todo cli", stars: 10 })] });
    const llm = new FakeLLM({
      prior_art_analysis: {
        summary: "prior art exists",
        candidates: [{ candidateId: "a/b", axisScores: LIKELY, rationale: "metadata" }],
        yourAngle: { summary: "your angle", missingFeatures: [] },
      },
      deep_judgement: {
        axisScores: LIKELY,
        rationale: "file evidence",
        evidence: [{ path: "src/main.ts", line: 1, note: "entry" }],
      },
    });

    const { report } = await validate({
      idea: "a todo cli",
      llm,
      config: testConfig(),
      adapters: [adapter],
      deep: { cloner },
    });

    expect(report.depth).toBe("deep");
    expect(report.candidates[0]?.inspected).toBe(true);
    expect(report.candidates[0]?.evidence).toHaveLength(1);
    expect(report.stats.clonesSucceeded).toBe(1);
  });
});

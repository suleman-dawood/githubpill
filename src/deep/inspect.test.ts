import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectCandidates } from "./inspect.js";
import type { Cloner } from "./clone.js";
import { FakeLLM, testConfig } from "../testing/fakes.js";
import type { QueryPlan, ReportCandidate } from "../types.js";

const plan: QueryPlan = {
  sharpened: "a todo cli",
  keywords: [],
  productNames: [],
  topics: [],
  preservedTerms: [],
};

function candidate(overrides: Partial<ReportCandidate> = {}): ReportCandidate {
  return {
    id: "acme/demo",
    name: "acme/demo",
    url: "https://github.com/acme/demo",
    description: "demo",
    sources: ["github"],
    label: "WORTH_INSPECTING",
    axisScores: { coreFunction: 2, targetAudience: 2, scope: 2, approach: 2, activity: 2 },
    axisSum: 10,
    rationale: "metadata",
    ...overrides,
  };
}

const cloner: Cloner = {
  async clone() {
    const root = await mkdtemp(join(tmpdir(), "ghp-inspect-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "main.ts"), "a\nb\nc\n");
    return root;
  },
};

function deepJudge(evidence: unknown[]): FakeLLM {
  return new FakeLLM({
    deep_judgement: {
      axisScores: { coreFunction: 3, targetAudience: 3, scope: 3, approach: 2, activity: 3 },
      rationale: "deep",
      evidence,
    },
  });
}

describe("inspectCandidates", () => {
  it("replaces the metadata judgement with file evidence", async () => {
    const result = await inspectCandidates({
      candidates: [candidate()],
      plan,
      llm: deepJudge([{ path: "src/main.ts", line: 1, note: "entry" }]),
      config: testConfig(),
      deep: { cloner },
    });

    const first = result.candidates[0];
    expect(first?.inspected).toBe(true);
    expect(first?.evidence).toEqual([{ path: "src/main.ts", line: 1, note: "entry" }]);
    expect(first?.label).toBe("LIKELY_MATCH");
    expect(result.succeeded).toBe(1);
  });

  it("caps the label when no citation survives", async () => {
    const result = await inspectCandidates({
      candidates: [candidate()],
      plan,
      llm: deepJudge([{ path: "src/main.ts", line: 99, note: "past the end" }]),
      config: testConfig(),
      deep: { cloner },
    });

    expect(result.candidates[0]?.evidence).toEqual([]);
    expect(result.candidates[0]?.label).toBe("WORTH_INSPECTING");
  });

  it("keeps the metadata judgement when cloning fails", async () => {
    const failing: Cloner = {
      clone: async () => {
        throw new Error("clone failed");
      },
    };

    const result = await inspectCandidates({
      candidates: [candidate()],
      plan,
      llm: deepJudge([]),
      config: testConfig(),
      deep: { cloner: failing },
    });

    expect(result.candidates[0]?.inspected).toBeUndefined();
    expect(result.candidates[0]?.rationale).toBe("metadata");
    expect(result.attempted).toBe(1);
    expect(result.succeeded).toBe(0);
  });

  it("skips candidates that are not GitHub repositories", async () => {
    const npmCandidate = candidate({ id: "some-pkg", url: "https://www.npmjs.com/package/some-pkg" });

    const result = await inspectCandidates({
      candidates: [npmCandidate],
      plan,
      llm: deepJudge([]),
      config: testConfig(),
      deep: { cloner },
    });

    expect(result.attempted).toBe(0);
  });
});

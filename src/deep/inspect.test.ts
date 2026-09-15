import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { inspectCandidates } from "./inspect.js";
import type { Cloner } from "./clone.js";
import { FakeLLM, testConfig } from "../testing/fakes.js";
import type { Candidate, QueryPlan } from "../types.js";

const plan: QueryPlan = {
  sharpened: "a todo cli",
  keywords: [],
  productNames: [],
  topics: [],
  preservedTerms: [],
};

const tmpDirs: string[] = [];
afterAll(() => Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true }))));

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: "acme/demo",
    name: "acme/demo",
    url: "https://github.com/acme/demo",
    description: "demo",
    sources: ["github"],
    matchedQueries: ["a todo cli"],
    score: 1,
    ...overrides,
  };
}

const cloner: Cloner = {
  async clone() {
    const root = await mkdtemp(join(tmpdir(), "ghp-inspect-"));
    tmpDirs.push(root);
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
  it("returns file evidence for a cloned candidate", async () => {
    const result = await inspectCandidates({
      candidates: [candidate()],
      plan,
      llm: deepJudge([{ path: "src/main.ts", line: 1, note: "entry" }]),
      config: testConfig(),
      deep: { cloner },
    });

    expect(result.succeeded).toBe(1);
    expect(result.inspections[0]?.evidence).toEqual([{ path: "src/main.ts", line: 1, note: "entry" }]);
  });

  it("drops citations that do not resolve", async () => {
    const result = await inspectCandidates({
      candidates: [candidate()],
      plan,
      llm: deepJudge([{ path: "src/main.ts", line: 99, note: "past the end" }]),
      config: testConfig(),
      deep: { cloner },
    });

    expect(result.inspections[0]?.evidence).toEqual([]);
  });

  it("records a clone failure without throwing", async () => {
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

    expect(result.inspections).toHaveLength(0);
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

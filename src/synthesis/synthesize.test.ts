import { describe, expect, it } from "vitest";
import { synthesize } from "./synthesize.js";
import { FakeLLM } from "../testing/fakes.js";
import type { Candidate, QueryPlan } from "../types.js";

const plan: QueryPlan = {
  sharpened: "a todo cli",
  keywords: ["todo cli"],
  productNames: [],
  topics: ["todo"],
  preservedTerms: [],
};

const candidate: Candidate = {
  id: "a/b",
  name: "a/b",
  url: "https://github.com/a/b",
  description: "a todo cli",
  sources: ["github"],
  matchedQueries: ["todo cli"],
  score: 1,
};

function llmWith(candidates: unknown[], missingFeatures: string[] = []): FakeLLM {
  return new FakeLLM({
    prior_art_analysis: {
      summary: "something exists",
      candidates,
      yourAngle: { summary: "your angle", missingFeatures },
    },
  });
}

describe("synthesize", () => {
  it("derives labels from axis scores rather than the model", async () => {
    const llm = llmWith([
      {
        candidateId: "a/b",
        axisScores: { coreFunction: 3, targetAudience: 3, scope: 3, approach: 2, activity: 3 },
        rationale: "matches",
      },
    ]);
    const result = await synthesize("a todo cli", plan, [candidate], llm);
    expect(result.candidates[0]?.label).toBe("LIKELY_MATCH");
    expect(result.candidates[0]?.axisSum).toBe(14);
  });

  it("defaults unjudged candidates to UNRELATED", async () => {
    const result = await synthesize("a todo cli", plan, [candidate], llmWith([]));
    expect(result.candidates[0]?.label).toBe("UNRELATED");
  });

  it("returns a clean result when there are no candidates", async () => {
    const result = await synthesize("a todo cli", plan, [], new FakeLLM());
    expect(result.candidates).toHaveLength(0);
    expect(result.yourAngle.missingFeatures).toEqual([]);
  });
});

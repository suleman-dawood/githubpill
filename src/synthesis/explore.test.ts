import { describe, expect, it } from "vitest";
import { buildExplorationPrompt, synthesizeExploration } from "./explore.js";
import { FakeLLM } from "../testing/fakes.js";
import type { Candidate, QueryPlan } from "../types.js";

const plan: QueryPlan = {
  sharpened: "a terminal file manager",
  keywords: ["terminal file manager"],
  productNames: [],
  topics: ["file-manager"],
  preservedTerms: [],
};

const candidate: Candidate = {
  id: "a/b",
  name: "a/b",
  url: "https://github.com/a/b",
  description: "a tui file manager",
  sources: ["github"],
  matchedQueries: ["terminal file manager"],
  score: 1,
};

function llmWith(output: unknown): FakeLLM {
  return new FakeLLM({ exploration: output });
}

describe("synthesizeExploration", () => {
  it("returns clusters, gaps, and directions", async () => {
    const llm = llmWith({
      summary: "A crowded space.",
      clusters: [{ theme: "TUIs", summary: "Terminal managers.", candidateIds: ["a/b"] }],
      gaps: [{ observation: "None is Rust-based.", candidateIds: ["a/b"] }],
      directions: [{ idea: "A Rust TUI file manager", why: "All are C or Go.", groundedIn: ["a/b"] }],
    });

    const result = await synthesizeExploration("terminal file manager", plan, [candidate], llm);

    expect(result.clusters).toHaveLength(1);
    expect(result.gaps[0]?.observation).toContain("Rust");
    expect(result.directions[0]?.groundedIn).toEqual(["a/b"]);
    expect(result.candidates[0]?.id).toBe("a/b");
  });

  it("drops ids that were not retrieved", async () => {
    const llm = llmWith({
      summary: "s",
      clusters: [{ theme: "x", summary: "y", candidateIds: ["ghost/repo"] }],
      gaps: [{ observation: "o", candidateIds: ["ghost/repo"] }],
      directions: [{ idea: "i", why: "w", groundedIn: ["ghost/repo"] }],
    });

    const result = await synthesizeExploration("topic", plan, [candidate], llm);

    expect(result.clusters).toHaveLength(0);
    expect(result.gaps).toHaveLength(0);
    expect(result.directions).toHaveLength(0);
  });

  it("short-circuits when nothing was retrieved", async () => {
    const result = await synthesizeExploration("topic", plan, [], new FakeLLM());
    expect(result.candidates).toHaveLength(0);
    expect(result.summary).toContain("No projects");
  });

  it("includes clone evidence in the prompt and on the candidate", async () => {
    const llm = llmWith({
      summary: "s",
      clusters: [{ theme: "t", summary: "x", candidateIds: ["a/b"] }],
      gaps: [],
      directions: [{ idea: "i", why: "w", groundedIn: ["a/b"] }],
    });
    const evidence = new Map([["a/b", [{ path: "src/main.ts", line: 3, note: "entry" }]]]);

    const result = await synthesizeExploration("topic", plan, [candidate], llm, evidence);

    expect(result.candidates[0]?.inspected).toBe(true);
    expect(result.candidates[0]?.evidence).toEqual([{ path: "src/main.ts", line: 3, note: "entry" }]);

    const prompt = buildExplorationPrompt("topic", plan, [candidate], evidence);
    expect(prompt).toContain("src/main.ts:3");
  });
});

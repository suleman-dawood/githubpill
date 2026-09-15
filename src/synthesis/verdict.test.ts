import { describe, expect, it } from "vitest";
import { axisSum, corePair, deriveBand, deriveLabel, headlineFor } from "./verdict.js";
import type { AxisScores } from "../types.js";

const scores = (coreFunction: number, targetAudience: number, scope: number, approach: number, activity: number): AxisScores => ({
  coreFunction,
  targetAudience,
  scope,
  approach,
  activity,
});

describe("verdict derivation", () => {
  it("sums axes and the core pair", () => {
    expect(axisSum(scores(3, 2, 3, 2, 2))).toBe(12);
    expect(corePair(scores(3, 2, 3, 2, 2))).toBe(5);
  });

  it("labels LIKELY_MATCH at the threshold", () => {
    expect(deriveLabel(scores(3, 2, 3, 2, 2))).toBe("LIKELY_MATCH");
  });

  it("labels WORTH_INSPECTING below LIKELY_MATCH", () => {
    expect(deriveLabel(scores(2, 2, 2, 1, 1))).toBe("WORTH_INSPECTING");
  });

  it("labels UNRELATED when the core pair is weak", () => {
    expect(deriveLabel(scores(1, 1, 1, 1, 1))).toBe("UNRELATED");
  });

  it("is deterministic for identical scores", () => {
    expect(deriveLabel(scores(2, 3, 2, 2, 2))).toBe(deriveLabel(scores(2, 3, 2, 2, 2)));
  });

  it("derives the band from the strongest label", () => {
    expect(deriveBand(["UNRELATED", "LIKELY_MATCH"])).toBe("red");
    expect(deriveBand(["UNRELATED", "WORTH_INSPECTING"])).toBe("yellow");
    expect(deriveBand(["UNRELATED", "UNRELATED"])).toBe("green");
    expect(deriveBand([])).toBe("green");
  });

  it("pluralizes headlines", () => {
    expect(headlineFor("yellow", 1)).toContain("1 candidate");
    expect(headlineFor("yellow", 2)).toContain("2 candidates");
    expect(headlineFor("red", 1)).toContain("1 strong match");
    expect(headlineFor("red", 2)).toContain("2 strong matches");
    expect(headlineFor("green", 0)).toContain("novel");
  });
});

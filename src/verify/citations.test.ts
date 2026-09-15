import { describe, expect, it } from "vitest";
import { verifyCandidates } from "./citations.js";
import { FakeAdapter, testConfig } from "../testing/fakes.js";
import type { Candidate } from "../types.js";

const candidate: Candidate = {
  id: "a/b",
  name: "a/b",
  url: "https://github.com/a/b",
  description: "",
  sources: ["github"],
  matchedQueries: [],
  score: 1,
};

describe("verifyCandidates", () => {
  it("drops candidates that fail verification", async () => {
    const result = await verifyCandidates(
      [candidate],
      [new FakeAdapter({ verifyOk: false })],
      testConfig(),
    );
    expect(result.candidates).toHaveLength(0);
    expect(result.dropped).toHaveLength(1);
    expect(result.checked).toBe(1);
  });

  it("keeps verified candidates and attaches a timestamp", async () => {
    const result = await verifyCandidates(
      [candidate],
      [new FakeAdapter({ verifyOk: true })],
      testConfig(),
    );
    expect(result.candidates[0]?.verification?.ok).toBe(true);
    expect(result.candidates[0]?.verification?.checkedAt).toBeTruthy();
    expect(result.alive).toBe(1);
  });

  it("keeps candidates whose check was inconclusive", async () => {
    const result = await verifyCandidates(
      [candidate],
      [new FakeAdapter({ verifyStatus: 403 })],
      testConfig(),
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.unverified).toHaveLength(1);
    expect(result.dropped).toHaveLength(0);
  });

  it("passes through candidates with no matching adapter", async () => {
    const result = await verifyCandidates(
      [{ ...candidate, sources: ["npm"] }],
      [new FakeAdapter({ id: "github" })],
      testConfig(),
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.checked).toBe(0);
  });
});

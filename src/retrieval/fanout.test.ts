import { describe, expect, it } from "vitest";
import { fanout } from "./fanout.js";
import { planQueries } from "./query-plan.js";
import { FakeAdapter, hit, testConfig } from "../testing/fakes.js";
import type { SourceAdapter } from "../adapters/index.js";

const failing: SourceAdapter = {
  id: "npm",
  label: "npm",
  async search() {
    throw new Error("boom");
  },
  async verify() {
    throw new Error("unreachable");
  },
};

describe("fanout", () => {
  it("records a failing query and keeps the successful ones", async () => {
    const good = new FakeAdapter({ id: "github", hits: [hit({ id: "a/b" })] });

    const result = await fanout([good, failing], planQueries("a todo cli"), testConfig());

    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain("boom");
    expect(result.runs.some((run) => run.source === "npm" && run.hits === 0)).toBe(true);
  });
});

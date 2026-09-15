import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { explore } from "./explore.js";
import { FakeAdapter, FakeLLM, hit, testConfig } from "./testing/fakes.js";
import type { Cloner } from "./deep/clone.js";

const tmpDirs: string[] = [];
afterAll(() => Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true }))));

const cloner: Cloner = {
  async clone() {
    const root = await mkdtemp(join(tmpdir(), "ghp-explore-"));
    tmpDirs.push(root);
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "main.ts"), "a\nb\nc\n");
    return root;
  },
};

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

  it("deep mode attaches clone evidence to explored candidates", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b", description: "note app", stars: 5 })] });
    const llm = new FakeLLM({
      exploration: {
        summary: "A crowded space.",
        clusters: [{ theme: "Notes", summary: "Note apps.", candidateIds: ["a/b"] }],
        gaps: [{ observation: "None is local-first.", candidateIds: ["a/b"] }],
        directions: [{ idea: "Local-first notes", why: "All are cloud.", groundedIn: ["a/b"] }],
      },
      deep_judgement: {
        axisScores: { coreFunction: 3, targetAudience: 2, scope: 2, approach: 2, activity: 3 },
        rationale: "same problem",
        evidence: [{ path: "src/main.ts", line: 1, note: "entry" }],
      },
    });

    const { report } = await explore({
      topic: "local-first note taking",
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

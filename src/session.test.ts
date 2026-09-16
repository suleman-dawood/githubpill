import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  finish,
  prepare,
  readResponses,
  readSession,
  writeSession,
} from "./session.js";
import { FakeAdapter, hit, testConfig } from "./testing/fakes.js";
import type { Cloner } from "./deep/clone.js";
import type { Report } from "./types.js";

const LIKELY = { coreFunction: 3, targetAudience: 3, scope: 3, approach: 2, activity: 3 };

const tmpDirs: string[] = [];
afterAll(() => Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true }))));

async function workDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ghp-session-"));
  tmpDirs.push(dir);
  return dir;
}

const cloner: Cloner = {
  async clone() {
    const root = await mkdtemp(join(tmpdir(), "ghp-session-clone-"));
    tmpDirs.push(root);
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "main.ts"), "a\nb\nc\n");
    return root;
  },
};

function synthesisResponse(candidateId: string) {
  return {
    summary: "prior art exists",
    candidates: [{ candidateId, axisScores: LIKELY, rationale: "same problem" }],
    yourAngle: { summary: "your angle", missingFeatures: ["do better"] },
  };
}

describe("prepare", () => {
  it("emits a synthesis request without contacting an LLM", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b", description: "todo cli", stars: 10 })] });
    const state = await prepare({ idea: "a todo cli", config: testConfig(), adapters: [adapter] });

    expect(state.mode).toBe("validate");
    expect(state.retrieval.candidates).toHaveLength(1);
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]?.key).toBe("synthesis");
    expect(state.requests[0]?.schemaName).toBe("prior_art_analysis");
    expect(state.requests[0]?.prompt).toContain("a/b");
    expect(state.requests[0]?.jsonSchema).toHaveProperty("properties");
  });

  it("emits an exploration request in explore mode", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b" })] });
    const state = await prepare({
      idea: "local-first notes",
      config: testConfig(),
      adapters: [adapter],
      mode: "explore",
    });

    expect(state.mode).toBe("explore");
    expect(state.requests[0]?.key).toBe("exploration");
    expect(state.requests[0]?.schemaName).toBe("exploration");
  });

  it("clones candidates and emits a deep request in deep mode", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b", stars: 10 })] });
    const state = await prepare({
      idea: "a todo cli",
      config: testConfig(),
      adapters: [adapter],
      deep: { cloner },
    });

    expect(state.deep).toBe(true);
    expect(state.requests.map((request) => request.key)).toEqual(["synthesis", "deep/a/b"]);
    expect(state.requests[1]?.prompt).toContain("src/main.ts");
    expect(Object.keys(state.clones ?? {})).toEqual(["a/b"]);
  });

  it("emits no requests when nothing is retrieved", async () => {
    const adapter = new FakeAdapter({ hits: [] });
    const state = await prepare({ idea: "a todo cli", config: testConfig(), adapters: [adapter] });

    expect(state.requests).toHaveLength(0);
    const { report } = await finish({ state, responses: {} });
    expect(report.candidates).toHaveLength(0);
  });
});

describe("finish", () => {
  it("derives a red verdict from the agent's synthesis", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b", description: "todo cli", stars: 10 })] });
    const state = await prepare({ idea: "a todo cli", config: testConfig(), adapters: [adapter] });

    const { report } = (await finish({
      state,
      responses: { synthesis: synthesisResponse("a/b") },
    })) as { report: Report };

    expect(report.band).toBe("red");
    expect(report.candidates[0]?.label).toBe("LIKELY_MATCH");
    expect(report.headline).toContain("exists");
  });

  it("builds an exploration report from the agent's clustering", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b" })] });
    const state = await prepare({
      idea: "local-first notes",
      config: testConfig(),
      adapters: [adapter],
      mode: "explore",
    });

    const { report } = await finish({
      state,
      responses: {
        exploration: {
          summary: "the space",
          clusters: [{ theme: "editors", summary: "note editors", candidateIds: ["a/b"] }],
          gaps: [{ observation: "none sync offline", candidateIds: ["a/b"] }],
          directions: [{ idea: "offline sync", why: "gap", groundedIn: ["a/b"] }],
        },
      },
    });

    expect("clusters" in report && report.clusters).toHaveLength(1);
  });

  it("folds deep file evidence into the verdict", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b", description: "todo cli", stars: 10 })] });
    const state = await prepare({
      idea: "a todo cli",
      config: testConfig(),
      adapters: [adapter],
      deep: { cloner },
    });

    const { report } = (await finish({
      state,
      responses: {
        synthesis: synthesisResponse("a/b"),
        "deep/a/b": {
          axisScores: LIKELY,
          rationale: "file evidence",
          evidence: [{ path: "src/main.ts", line: 1, note: "entry" }],
        },
      },
    })) as { report: Report };

    expect(report.depth).toBe("deep");
    expect(report.candidates[0]?.inspected).toBe(true);
    expect(report.candidates[0]?.evidence).toHaveLength(1);
    expect(report.stats.clonesSucceeded).toBe(1);
  });

  it("rejects a missing response", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b" })] });
    const state = await prepare({ idea: "a todo cli", config: testConfig(), adapters: [adapter] });

    await expect(finish({ state, responses: {} })).rejects.toThrow(/no response supplied/);
  });
});

describe("session files", () => {
  it("round-trips state and responses through the work directory", async () => {
    const adapter = new FakeAdapter({ hits: [hit({ id: "a/b" })] });
    const state = await prepare({ idea: "a todo cli", config: testConfig(), adapters: [adapter] });
    const dir = await workDir();

    await writeSession(dir, state);
    const loaded = await readSession(dir);
    expect(loaded.retrieval.candidates[0]?.id).toBe("a/b");

    await writeFile(
      join(dir, "responses", state.requests[0]!.file),
      JSON.stringify(synthesisResponse("a/b")),
      "utf8",
    );
    const responses = await readResponses(dir, loaded);
    expect(responses.synthesis).toBeTruthy();

    const raw = await readFile(join(dir, "requests", state.requests[0]!.file), "utf8");
    expect(JSON.parse(raw).key).toBe("synthesis");
  });
});

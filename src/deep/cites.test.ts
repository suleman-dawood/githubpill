import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkCitations } from "./cites.js";

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "ghp-cites-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src", "main.ts"), "a\nb\nc\n");
});

afterAll(() => rm(root, { recursive: true, force: true }));

describe("checkCitations", () => {
  it("keeps real lines and rejects bad ones", async () => {
    const { valid, invalid } = await checkCitations(root, [
      { path: "src/main.ts", line: 2, note: "ok" },
      { path: "src/main.ts", line: 99, note: "past the end" },
      { path: "missing.ts", line: 1, note: "no such file" },
      { path: "../escape.ts", line: 1, note: "traversal" },
    ]);

    expect(valid.map((cite) => cite.note)).toEqual(["ok"]);
    expect(invalid).toHaveLength(3);
  });
});

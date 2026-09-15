import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { firstLines, sanitize, selectSourceFiles } from "./files.js";

const dirs: string[] = [];

async function makeRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ghp-files-"));
  dirs.push(root);
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "node_modules"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Demo\n");
  await writeFile(join(root, "package.json"), '{"name":"demo"}\n');
  await writeFile(join(root, "src", "main.ts"), "line1\nline2\nline3\nline4\n");
  await writeFile(join(root, "src", "small.ts"), "x\n");
  await writeFile(join(root, "node_modules", "dep.js"), "module.exports = {}\n");
  return root;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("sanitize", () => {
  it("strips HTML comments and zero-width characters", () => {
    expect(sanitize("a<!-- secret -->b\u200bc\ufeffd")).toBe("abcd");
  });
});

describe("firstLines", () => {
  it("keeps at most maxLines", () => {
    expect(firstLines("a\nb\nc", 2)).toBe("a\nb");
  });
});

describe("selectSourceFiles", () => {
  it("prefers manifests and entry points and skips ignored directories", async () => {
    const root = await makeRepo();
    const files = await selectSourceFiles(root, 3, 10);
    const paths = files.map((file) => file.path);

    expect(paths).toContain("package.json");
    expect(paths).toContain("src/main.ts");
    expect(paths).not.toContain("node_modules/dep.js");
    expect(files.length).toBeLessThanOrEqual(3);
  });

  it("truncates file contents", async () => {
    const root = await makeRepo();
    const files = await selectSourceFiles(root, 10, 2);
    const main = files.find((file) => file.path === "src/main.ts");
    expect(main?.content).toBe("line1\nline2");
  });
});

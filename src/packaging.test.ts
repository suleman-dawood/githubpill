import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string): string => readFileSync(join(root, path), "utf8");
const json = <T>(path: string): T => JSON.parse(read(path)) as T;

describe("packaging", () => {
  it("ships a valid skill whose name matches its directory", () => {
    const skill = read("skills/githubpill/SKILL.md");
    expect(skill.startsWith("---")).toBe(true);
    expect(skill).toMatch(/^name: githubpill$/m);
    expect(skill).toMatch(/^description: .{20,}/m);
  });

  it("describes how to run the CLI", () => {
    const skill = read("skills/githubpill/SKILL.md");
    expect(skill).toContain("githubpill \"");
    expect(skill).toContain("ANTHROPIC_API_KEY");
  });

  it("points the package bin at the built CLI", () => {
    const pkg = json<{ bin: Record<string, string>; version: string }>("package.json");
    expect(pkg.bin.githubpill).toBe("./dist/cli.js");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("ships valid, correctly named plugin manifests", () => {
    expect(json<{ name: string }>(".claude-plugin/plugin.json").name).toBe("githubpill");
    expect(json<{ name: string }>(".claude-plugin/marketplace.json").name).toBe("githubpill");
  });
});

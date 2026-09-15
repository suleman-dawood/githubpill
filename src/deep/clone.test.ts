import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CloneError, cleanupClone, gitCloner } from "./clone.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function makeGitRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ghp-origin-"));
  dirs.push(root);
  await writeFile(join(root, "README.md"), "# demo\n");

  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "test",
    GIT_COMMITTER_EMAIL: "test@example.com",
  };
  const git = (args: string[]): void => {
    execFileSync("git", ["-C", root, ...args], { stdio: "ignore", env });
  };
  git(["init", "-q"]);
  git(["add", "."]);
  git(["commit", "-q", "-m", "init"]);
  return root;
}

describe("gitCloner", () => {
  it("clones a repository into a temp directory", async () => {
    const origin = await makeGitRepo();
    const dest = await gitCloner.clone(origin, { timeoutMs: 20_000 });
    dirs.push(dest);

    expect(existsSync(join(dest, "README.md"))).toBe(true);
    await cleanupClone(dest);
  });

  it("throws CloneError when the source is not a repository", async () => {
    const plain = await mkdtemp(join(tmpdir(), "ghp-plain-"));
    dirs.push(plain);

    await expect(gitCloner.clone(plain, { timeoutMs: 10_000 })).rejects.toBeInstanceOf(CloneError);
  });
});

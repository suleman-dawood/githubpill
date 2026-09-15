import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GithubPillError } from "../errors.js";

export class CloneError extends GithubPillError {}

export interface CloneOptions {
  timeoutMs?: number;
}

/** Clones a repository. Injectable so tests need neither git nor the network. */
export interface Cloner {
  clone(url: string, options?: CloneOptions): Promise<string>;
}

const DEFAULT_TIMEOUT_MS = 60_000;

/** Shallow, blobless clone with a timeout; returns the temp directory. */
export const gitCloner: Cloner = {
  async clone(url: string, options: CloneOptions = {}): Promise<string> {
    const dest = await mkdtemp(join(tmpdir(), "githubpill-"));
    try {
      await run(
        "git",
        ["clone", "--depth", "1", "--filter=blob:none", "--single-branch", "--no-tags", url, dest],
        options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      );
      return dest;
    } catch (error) {
      await cleanupClone(dest);
      throw error;
    }
  },
};

export async function cleanupClone(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

function run(command: string, args: readonly string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new CloneError(`clone timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new CloneError(`git failed to start: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new CloneError(`git exited ${code}: ${stderr.trim().slice(0, 200)}`));
    });
  });
}

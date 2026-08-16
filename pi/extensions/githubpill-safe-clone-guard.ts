/**
 * githubpill-safe-clone-guard.ts — pi bash spawn-hook extension.
 *
 * Port of GithubPill's Claude Code PreToolUse hook
 * (hooks/safe-clone-guard.sh) for pi. Enforces the clone-safety contract on
 * every `bash` tool call:
 *   - size pre-check via gh api (rejects > 50MB, or GITHUBPILL_MAX_SIZE_KB)
 *   - --depth 1 --filter=blob:none --single-branch --no-tags
 *   - GIT_LFS_SKIP_SMUDGE=1
 *   - 60s timeout wrapper
 *
 * The safety logic itself lives in pi/scripts/safe-clone-guard.sh (a plain
 * bash contract, unit-testable in CI); this extension is a thin adapter that
 * feeds every bash command through it and swaps in the rewritten command.
 *
 * Install:  bash pi/install.sh   (or copy this file to ~/.pi/agent/extensions/
 * and restart pi / run /reload).
 *
 * Note: pi registers `bash` itself, so this extension re-registers the bash
 * tool wrapped in the spawn hook — same pattern as pi's own
 * bash-spawn-hook.ts example. Do not combine with another extension that
 * re-registers bash.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createBashTool } from "@earendil-works/pi-coding-agent";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_NAME = "safe-clone-guard.sh";

/**
 * Locate pi/scripts/safe-clone-guard.sh.
 *
 * The extension is symlinked into ~/.pi/agent/extensions/ by pi/install.sh,
 * so resolve the real path (the repo checkout) and walk up to the repo root.
 * Falls back to the non-symlinked layout for `pi -e` quick tests.
 */
function guardScriptPath(): string {
	const here = fileURLToPath(import.meta.url);

	const fromRepo = (root: string) => path.join(root, "pi", "scripts", SCRIPT_NAME);

	// Symlinked install: realpath points into the repo checkout.
	try {
		const real = fs.realpathSync(here);
		const repoRoot = path.resolve(path.dirname(real), "..", "..");
		const viaReal = fromRepo(repoRoot);
		if (fs.existsSync(viaReal)) return viaReal;
	} catch {
		/* fall through */
	}

	// Direct layout: <repo>/pi/extensions/githubpill-safe-clone-guard.ts
	const directRoot = path.resolve(path.dirname(here), "..", "..");
	const viaDirect = fromRepo(directRoot);
	if (fs.existsSync(viaDirect)) return viaDirect;

	throw new Error(
		`githubpill-safe-clone-guard: could not locate ${SCRIPT_NAME} relative to ${here}. ` +
			"Re-run bash pi/install.sh.",
	);
}

/** Replace a blocked command with one that surfaces the deny reason and fails. */
function denyCommand(reason: string): string {
	const escaped = reason.replace(/'/g, "'\\''");
	return `echo "safe-clone-guard: ${escaped}" >&2 && exit 2`;
}

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();
	const script = guardScriptPath();

	const bashTool = createBashTool(cwd, {
		spawnHook: ({ command, cwd, env }) => {
			let verdict: string;
			try {
				verdict = execFileSync("bash", [script, command], {
					encoding: "utf8",
					timeout: 30_000,
					env: {
						...process.env,
						GITHUBPILL_MAX_SIZE_KB: process.env.GITHUBPILL_MAX_SIZE_KB ?? "",
					},
				}).trim();
			} catch {
				// Guard malfunction — fail closed with a clear reason.
				return {
					command: denyCommand(`guard script failed to run (${script}); check the pi install`),
					cwd,
					env,
				};
			}

			if (verdict.startsWith("DENY:")) {
				return { command: denyCommand(verdict.slice("DENY:".length)), cwd, env };
			}
			if (verdict.startsWith("REWRITE:")) {
				return { command: verdict.slice("REWRITE:".length), cwd, env };
			}
			return { command, cwd, env };
		},
	});

	pi.registerTool({
		...bashTool,
		execute: async (id, params, signal, onUpdate, _ctx) => {
			return bashTool.execute(id, params, signal, onUpdate);
		},
	});
}

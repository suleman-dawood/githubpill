/**
 * githubpill-subagent — minimal subagent tool for the GithubPill pi port.
 *
 * Provides the pi-side of the skill's Step DEEP-F: dispatch one judge
 * subagent per cloned candidate, in parallel, each with an isolated context
 * window. This is the pi analog of Claude Code's Task tool; it spawns a
 * separate `pi --mode json -p --no-session` process per subagent.
 *
 * Scope is deliberately smaller than pi's full subagent example (no chain
 * mode, no TUI renderers): GithubPill only needs single + parallel dispatch
 * of the `githubpill-judge` agent, with the final text output captured.
 *
 * Agents are discovered from ~/.pi/agent/agents/*.md (user scope, default)
 * and the nearest ancestor .pi/agents/ (project scope). The GithubPill port
 * installs its judge agent via pi/install.sh.
 *
 * Install:  bash pi/install.sh   (or copy this directory to
 * ~/.pi/agent/extensions/githubpill-subagent/ and restart pi / run /reload).
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getAgentDir, parseFrontmatter } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const MAX_PARALLEL_TASKS = 8;
const MAX_CONCURRENCY = 4;
const AGENT_TIMEOUT_MS = 600_000; // 10 min per subagent (deep-search judge budget)

interface AgentConfig {
	name: string;
	description: string;
	tools?: string[];
	model?: string;
	systemPrompt: string;
	source: "user" | "project";
	filePath: string;
}

interface SingleResult {
	agent: string;
	exitCode: number;
	output: string;
	error?: string;
}

// ---------------------------------------------------------------------------
// Agent discovery
// ---------------------------------------------------------------------------

function loadAgentsFromDir(dir: string, source: "user" | "project"): AgentConfig[] {
	const agents: AgentConfig[] = [];
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return agents;
	}
	for (const entry of entries) {
		if (!entry.name.endsWith(".md")) continue;
		if (!entry.isFile() && !entry.isSymbolicLink()) continue;
		const filePath = path.join(dir, entry.name);
		let content: string;
		try {
			content = fs.readFileSync(filePath, "utf-8");
		} catch {
			continue;
		}
		const parsed = parseFrontmatter(content);
		if (!parsed.frontmatter.name || !parsed.frontmatter.description) continue;
		const fm = parsed.frontmatter;
		const tools = fm.tools
			? String(fm.tools)
					.split(/[\s,]+/)
					.map((t: string) => t.trim())
					.filter(Boolean)
			: undefined;
		agents.push({
			name: fm.name,
			description: fm.description,
			tools: tools && tools.length > 0 ? tools : undefined,
			model: fm.model,
			systemPrompt: parsed.body,
			source,
			filePath,
		});
	}
	return agents;
}

function findNearestProjectAgentsDir(cwd: string): string | null {
	let currentDir = cwd;
	while (true) {
		const candidate = path.join(currentDir, ".pi", "agents");
		try {
			if (fs.statSync(candidate).isDirectory()) return candidate;
		} catch {
			/* keep walking */
		}
		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) return null;
		currentDir = parentDir;
	}
}

function discoverAgents(cwd: string, scope: "user" | "project" | "both"): AgentConfig[] {
	const userAgents = scope === "project" ? [] : loadAgentsFromDir(path.join(getAgentDir(), "agents"), "user");
	const projectDir = findNearestProjectAgentsDir(cwd);
	const projectAgents =
		scope === "user" || !projectDir ? [] : loadAgentsFromDir(projectDir, "project");
	const agentMap = new Map<string, AgentConfig>();
	if (scope === "both") {
		for (const a of userAgents) agentMap.set(a.name, a);
		for (const a of projectAgents) agentMap.set(a.name, a);
	} else if (scope === "user") {
		for (const a of userAgents) agentMap.set(a.name, a);
	} else {
		for (const a of projectAgents) agentMap.set(a.name, a);
	}
	return Array.from(agentMap.values());
}

// ---------------------------------------------------------------------------
// Subagent process spawning
// ---------------------------------------------------------------------------

function getPiInvocation(): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
	if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript] };
	}
	const execName = path.basename(process.execPath).toLowerCase();
	const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
	if (!isGenericRuntime) {
		return { command: process.execPath, args: [] };
	}
	return { command: "pi", args: [] };
}

function getFinalOutput(lines: string[]): string {
	// In --mode json, the last assistant message_end text is the final output.
	let last: string | undefined;
	for (const line of lines) {
		if (!line.trim()) continue;
		let event: any;
		try {
			event = JSON.parse(line);
		} catch {
			continue;
		}
		if (event.type === "message_end" && event.message?.role === "assistant") {
			for (const part of event.message.content ?? []) {
				if (part.type === "text" && part.text) last = part.text;
			}
		}
	}
	return last ?? "";
}

function runSingleAgent(
	defaultCwd: string,
	agent: AgentConfig,
	task: string,
	cwd: string | undefined,
	signal: AbortSignal | undefined,
): Promise<SingleResult> {
	const invocation = getPiInvocation();
	const args = [...invocation.args, "--mode", "json", "-p", "--no-session"];
	if (agent.model) args.push("--model", agent.model);
	if (agent.tools && agent.tools.length > 0) args.push("--tools", agent.tools.join(","));

	let tmpDir: string | null = null;
	let tmpPromptPath: string | null = null;
	let tmpFailed = false;

	try {
		if (agent.systemPrompt.trim()) {
			tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-subagent-"));
			tmpPromptPath = path.join(tmpDir, "prompt.md");
			fs.writeFileSync(tmpPromptPath, agent.systemPrompt, { encoding: "utf-8", mode: 0o600 });
			args.push("--append-system-prompt", tmpPromptPath);
		}
	} catch {
		tmpFailed = true;
	}

	if (tmpFailed) {
		return Promise.resolve({
			agent: agent.name,
			exitCode: 1,
			output: "",
			error: "failed to write agent system prompt",
		});
	}

	args.push(`Task: ${task}`);

	return new Promise<SingleResult>((resolve) => {
		const proc = spawn(invocation.command, args, {
			cwd: cwd ?? defaultCwd,
			shell: false,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let buffer = "";
		const lines: string[] = [];
		let stderr = "";
		const timer = setTimeout(() => {
			proc.kill("SIGKILL");
		}, AGENT_TIMEOUT_MS);

		proc.stdout.on("data", (data: Buffer) => {
			buffer += data.toString();
			const parts = buffer.split("\n");
			buffer = parts.pop() || "";
			for (const p of parts) lines.push(p);
		});
		proc.stderr.on("data", (data: Buffer) => {
			stderr += data.toString();
		});
		proc.on("close", (code) => {
			clearTimeout(timer);
			if (buffer.trim()) lines.push(buffer);
			const output = getFinalOutput(lines);
			const isError = (code ?? 1) !== 0 || (!output && stderr.trim());
			resolve({
				agent: agent.name,
				exitCode: isError ? (code ?? 1) : 0,
				output,
				error: isError && !output ? stderr.trim() || "(no output)" : undefined,
			});
		});
		proc.on("error", (err) => {
			clearTimeout(timer);
			resolve({ agent: agent.name, exitCode: 1, output: "", error: String(err) });
		});
		if (signal) {
			const killProc = () => proc.kill("SIGTERM");
			if (signal.aborted) killProc();
			else signal.addEventListener("abort", killProc, { once: true });
		}
	}).finally(() => {
		if (tmpPromptPath)
			try {
				fs.unlinkSync(tmpPromptPath);
			} catch {
				/* ignore */
			}
		if (tmpDir)
			try {
				fs.rmdirSync(tmpDir);
			} catch {
				/* ignore */
			}
	});
}

async function mapWithConcurrencyLimit<T>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<T>,
): Promise<T[]> {
	const results: T[] = new Array(items.length);
	let nextIndex = 0;
	const workers = new Array(Math.max(1, Math.min(concurrency, items.length))).fill(0).map(async () => {
		while (true) {
			const current = nextIndex++;
			if (current >= items.length) return;
			results[current] = await fn(items[current], current);
		}
	});
	await Promise.all(workers);
	return results;
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

const TaskItem = Type.Object({
	agent: Type.String({ description: "Name of the agent to invoke" }),
	task: Type.String({ description: "Task to delegate to the agent" }),
	cwd: Type.Optional(Type.String({ description: "Working directory for the agent process" })),
});

const SubagentParams = Type.Object({
	agent: Type.Optional(Type.String({ description: "Name of the agent to invoke (single mode)" })),
	task: Type.Optional(Type.String({ description: "Task to delegate (single mode)" })),
	tasks: Type.Optional(Type.Array(TaskItem, { description: "Array of {agent, task} for parallel execution" })),
	agentScope: Type.Optional(
		Type.Union([Type.Literal("user"), Type.Literal("project"), Type.Literal("both")], {
			description: 'Which agent directories to use. Default: "user".',
			default: "user",
		}),
	),
});

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "subagent",
		label: "Subagent",
		description: [
			"Delegate tasks to specialized subagents with isolated context windows.",
			"Modes: single (agent + task) or parallel (tasks array).",
			"Agents: user scope from ~/.pi/agent/agents (default), project scope from .pi/agents.",
			"Each subagent runs in a separate pi process; the final text output is returned.",
		].join(" "),
		promptSnippet: "Delegate tasks to subagents (isolated context)",
		parameters: SubagentParams,

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const scope = params.agentScope ?? "user";
			const agents = discoverAgents(ctx.cwd, scope);
			const agentMap = new Map(agents.map((a) => [a.name, a]));

			const single = params.agent && params.task;
			const parallel = params.tasks && params.tasks.length > 0;
			if (single && parallel) {
				return {
					content: [{ type: "text" as const, text: "Provide exactly one mode: agent+task (single) or tasks (parallel)." }],
				};
			}

			const describe = (r: SingleResult) =>
				`[${r.agent}] ${r.exitCode === 0 ? "completed" : "failed"}: ${r.output.slice(0, 200) || r.error || "(no output)"}`;

			if (parallel && params.tasks) {
				if (params.tasks.length > MAX_PARALLEL_TASKS) {
					return {
						content: [
							{
								type: "text" as const,
								text: `Too many parallel tasks (${params.tasks.length}). Max is ${MAX_PARALLEL_TASKS}.`,
							},
						],
					};
				}
				const unknown = params.tasks.find((t) => !agentMap.has(t.agent));
				if (unknown) {
					return {
						content: [
							{
								type: "text" as const,
								text: `Unknown agent "${unknown.agent}". Available agents: ${agents.map((a) => a.name).join(", ") || "none"}.`,
							},
						],
					};
				}
				const results = await mapWithConcurrencyLimit(
					params.tasks,
					MAX_CONCURRENCY,
					async (t, i) => {
						const result = await runSingleAgent(ctx.cwd, agentMap.get(t.agent)!, t.task, t.cwd, signal);
						if (onUpdate) onUpdate({ content: [{ type: "text", text: `Parallel: ${i + 1}/${params.tasks!.length} done` }] });
						return result;
					},
				);
				const summaries = results.map(describe);
				return {
					content: [{ type: "text" as const, text: `Parallel: ${results.length} tasks\n\n${summaries.join("\n\n")}` }],
				};
			}

			if (single && params.agent && params.task) {
				const agent = agentMap.get(params.agent);
				if (!agent) {
					return {
						content: [
							{
								type: "text" as const,
								text: `Unknown agent "${params.agent}". Available agents: ${agents.map((a) => a.name).join(", ") || "none"}.`,
							},
						],
					};
				}
				const result = await runSingleAgent(ctx.cwd, agent, params.task, undefined, signal);
				return {
					content: [
						{
							type: "text" as const,
							text: result.exitCode === 0 ? result.output : `Agent failed: ${result.error || "(no output)"}`,
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text" as const,
						text: `Invalid parameters. Available agents: ${agents.map((a) => a.name).join(", ") || "none"}.`,
					},
				],
			};
		},
	});
}

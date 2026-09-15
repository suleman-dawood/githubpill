import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { ConfigError, ProviderError } from "../../errors.js";
import type { ProviderId } from "../../types.js";
import {
  extractJson,
  validateStructured,
  withJsonSchemaInstruction,
  withStructuredRetry,
} from "./structured.js";
import type { LLMClient, ProviderOptions, StructuredRequest } from "./types.js";

/** Runs a command and resolves with stdout. Injectable so tests need no CLI. */
export type HostRunner = (command: string, args: readonly string[], timeoutMs: number) => Promise<string>;

export interface HostClientOptions extends ProviderOptions {
  /** Force a specific agentic CLI instead of auto-detecting one. */
  agent?: string;
}

interface HostCommand {
  name: string;
  command: string;
  args: (prompt: string) => string[];
}

/** Non-interactive invocations for the agentic CLIs we know how to drive. */
const HOST_COMMANDS: Record<string, HostCommand> = {
  claude: { name: "claude", command: "claude", args: (prompt) => ["-p", prompt] },
  opencode: { name: "opencode", command: "opencode", args: (prompt) => ["run", prompt] },
  codex: { name: "codex", command: "codex", args: (prompt) => ["exec", prompt] },
  pi: { name: "pi", command: "pi", args: (prompt) => ["-p", prompt] },
};

const DETECTION_ORDER = ["claude", "opencode", "codex", "pi"] as const;

export function commandExists(command: string): boolean {
  const directories = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  return directories.some((directory) =>
    extensions.some((extension) => existsSync(join(directory, `${command}${extension}`))),
  );
}

export function resolveHost(agent?: string): HostCommand {
  const requested = agent ?? process.env.GITHUBPILL_AGENT;
  if (requested) {
    return HOST_COMMANDS[requested] ?? { name: requested, command: requested, args: (prompt) => [prompt] };
  }

  const found = DETECTION_ORDER.map((name) => HOST_COMMANDS[name]).find(
    (host) => host !== undefined && commandExists(host.command),
  );
  if (!found) {
    throw new ConfigError(
      "No agentic CLI found for the host provider (looked for claude, opencode, codex, pi). Install one, set GITHUBPILL_AGENT, or set an API key instead.",
    );
  }
  return found;
}

export const execHost: HostRunner = (command, args, timeoutMs) =>
  new Promise((resolve, reject) => {
    execFile(
      command,
      [...args],
      { timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const detail = (stderr || error.message).trim().slice(0, 300);
          reject(new ProviderError(`host agent failed: ${detail}`, "host"));
          return;
        }
        resolve(stdout);
      },
    );
  });

/**
 * Uses the host agentic CLI as the LLM, so no API key is required. The agent
 * is asked for JSON matching the schema and its output is parsed and validated
 * the same way as any other provider.
 */
export class HostClient implements LLMClient {
  readonly provider: ProviderId = "host";
  readonly model: string;
  private readonly host: HostCommand;

  constructor(
    private readonly options: HostClientOptions,
    private readonly runner: HostRunner = execHost,
  ) {
    this.model = options.agent ?? "host";
    this.host = resolveHost(options.agent);
  }

  async completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    return withStructuredRetry(async () => {
      const raw = await this.send(request);
      return validateStructured(request.schema, raw, this.provider);
    });
  }

  private async send(request: StructuredRequest<unknown>): Promise<unknown> {
    const prompt = `${request.system}\n\n${withJsonSchemaInstruction(request.prompt, request.schema)}`;
    const output = await this.runner(this.host.command, this.host.args(prompt), this.options.timeoutMs);
    return extractJson(output, this.provider);
  }
}

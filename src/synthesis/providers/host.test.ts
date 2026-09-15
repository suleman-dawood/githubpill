import { describe, expect, it } from "vitest";
import { z } from "zod";
import { HostClient, resolveHost, type HostRunner } from "./host.js";

const schema = z.object({ answer: z.string() });
const options = { apiKey: "", model: "host", maxTokens: 10, timeoutMs: 1_000 };
const request = { system: "be terse", prompt: "answer", schema, schemaName: "emit" };

describe("HostClient", () => {
  it("sends the schema and parses JSON out of fenced output", async () => {
    let captured = "";
    const runner: HostRunner = async (_command, args) => {
      captured = args.join(" ");
      return 'Here you go:\n```json\n{"answer":"ok"}\n```\n';
    };

    const client = new HostClient({ ...options, agent: "claude" }, runner);
    const result = await client.completeStructured(request);

    expect(client.provider).toBe("host");
    expect(result).toEqual({ answer: "ok" });
    expect(captured).toContain("JSON Schema");
    expect(captured).toContain('"answer"');
  });

  it("extracts JSON embedded in prose", async () => {
    const runner: HostRunner = async () => 'sure — {"answer":"ok"} hope that helps';
    const client = new HostClient({ ...options, agent: "opencode" }, runner);
    await expect(client.completeStructured(request)).resolves.toEqual({ answer: "ok" });
  });

  it("surfaces a host failure", async () => {
    const runner: HostRunner = async () => {
      throw new Error("boom");
    };
    const client = new HostClient({ ...options, agent: "claude" }, runner);
    await expect(client.completeStructured(request)).rejects.toThrow(/boom/);
  });
});

describe("resolveHost", () => {
  it("uses a known command for a named agent", () => {
    expect(resolveHost("claude").command).toBe("claude");
    expect(resolveHost("codex").command).toBe("codex");
  });

  it("treats an unknown name as a custom command", () => {
    const host = resolveHost("my-agent");
    expect(host.command).toBe("my-agent");
    expect(host.args("hello")).toEqual(["hello"]);
  });
});

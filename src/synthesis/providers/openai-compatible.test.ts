import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { OpenAICompatibleClient } from "./openai-compatible.js";
import { startMockServer, type MockServer } from "../../testing/mock-server.js";

const schema = z.object({ answer: z.string() });
const base = { apiKey: "test-key", model: "test-model", maxTokens: 100, timeoutMs: 1_000 };

interface ChatBody {
  temperature: number;
  messages: Array<{ role: string; content: string }>;
  response_format: {
    type: string;
    json_schema?: { strict?: boolean; schema?: { additionalProperties?: boolean } };
  };
}

let server: MockServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("OpenAICompatibleClient", () => {
  it("uses a strict json_schema for OpenAI", async () => {
    server = await startMockServer(() => ({
      json: { choices: [{ message: { content: JSON.stringify({ answer: "ok" }) } }] },
    }));
    const client = new OpenAICompatibleClient({
      ...base,
      provider: "openai",
      jsonMode: "json_schema",
      baseUrl: server.url,
    });

    const result = await client.completeStructured({ system: "s", prompt: "p", schema, schemaName: "emit" });

    expect(client.provider).toBe("openai");
    expect(result).toEqual({ answer: "ok" });
    expect(server.requests[0]?.headers["authorization"]).toBe("Bearer test-key");

    const body = server.requests[0]?.body as ChatBody;
    expect(body.temperature).toBe(0);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema?.strict).toBe(true);
    expect(body.response_format.json_schema?.schema?.additionalProperties).toBe(false);
  });

  it("uses json_object mode for DeepSeek and asks for JSON in the prompt", async () => {
    server = await startMockServer(() => ({
      json: { choices: [{ message: { content: JSON.stringify({ answer: "ok" }) } }] },
    }));
    const client = new OpenAICompatibleClient({
      ...base,
      provider: "deepseek",
      jsonMode: "json_object",
      baseUrl: server.url,
    });

    const result = await client.completeStructured({ system: "s", prompt: "p", schema, schemaName: "emit" });

    expect(client.provider).toBe("deepseek");
    expect(result).toEqual({ answer: "ok" });

    const body = server.requests[0]?.body as ChatBody;
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages.find((message) => message.role === "user")?.content).toMatch(/json/i);
  });

  it("reports a refusal as a provider error", async () => {
    server = await startMockServer(() => ({
      json: { choices: [{ message: { content: null, refusal: "cannot help" } }] },
    }));
    const client = new OpenAICompatibleClient({
      ...base,
      provider: "openai",
      jsonMode: "json_schema",
      baseUrl: server.url,
    });

    await expect(
      client.completeStructured({ system: "s", prompt: "p", schema, schemaName: "emit" }),
    ).rejects.toThrow(/refused/);
  });
});

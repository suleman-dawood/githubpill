import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { AnthropicClient } from "./anthropic.js";
import { startMockServer, type MockServer } from "../../testing/mock-server.js";

interface MessagesBody {
  temperature: number;
  tool_choice: { type: string; name: string };
  tools: Array<{ name: string; input_schema: { type?: string } }>;
}

const schema = z.object({ answer: z.string() });
const options = { apiKey: "test-key", model: "test-model", maxTokens: 100, timeoutMs: 1_000 };

let server: MockServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("AnthropicClient", () => {
  it("forces tool use at temperature 0 and parses the tool_use block", async () => {
    server = await startMockServer(() => ({
      json: { content: [{ type: "tool_use", name: "emit", input: { answer: "ok" } }] },
    }));
    const client = new AnthropicClient({ ...options, baseUrl: server.url });

    const result = await client.completeStructured({ system: "s", prompt: "p", schema, schemaName: "emit" });

    expect(client.provider).toBe("anthropic");
    expect(result).toEqual({ answer: "ok" });
    expect(server.requests[0]?.headers["x-api-key"]).toBe("test-key");

    const body = server.requests[0]?.body as MessagesBody;
    expect(body.temperature).toBe(0);
    expect(body.tool_choice).toEqual({ type: "tool", name: "emit" });
    expect(body.tools[0]?.input_schema.type).toBe("object");
  });

  it("surfaces provider errors with their status", async () => {
    server = await startMockServer(() => ({ status: 401, json: { error: { message: "invalid key" } } }));
    const client = new AnthropicClient({ ...options, baseUrl: server.url });

    await expect(
      client.completeStructured({ system: "s", prompt: "p", schema, schemaName: "emit" }),
    ).rejects.toThrow(/invalid key/);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { OpenAIClient } from "./openai.js";
import { startMockServer, type MockServer } from "../../testing/mock-server.js";

interface ChatBody {
  temperature: number;
  response_format: {
    type: string;
    json_schema: { name: string; strict: boolean; schema: { additionalProperties?: boolean } };
  };
}

const schema = z.object({ answer: z.string() });
const options = { apiKey: "test-key", model: "test-model", maxTokens: 100, timeoutMs: 1_000 };

let server: MockServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("OpenAIClient", () => {
  it("requests a strict json_schema and parses the message content", async () => {
    server = await startMockServer(() => ({
      json: { choices: [{ message: { content: JSON.stringify({ answer: "ok" }) } }] },
    }));
    const client = new OpenAIClient({ ...options, baseUrl: server.url });

    const result = await client.completeStructured({ system: "s", prompt: "p", schema, schemaName: "emit" });

    expect(client.provider).toBe("openai");
    expect(result).toEqual({ answer: "ok" });
    expect(server.requests[0]?.headers["authorization"]).toBe("Bearer test-key");

    const body = server.requests[0]?.body as ChatBody;
    expect(body.temperature).toBe(0);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.name).toBe("emit");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.additionalProperties).toBe(false);
  });

  it("reports a refusal as a provider error", async () => {
    server = await startMockServer(() => ({
      json: { choices: [{ message: { content: null, refusal: "cannot help" } }] },
    }));
    const client = new OpenAIClient({ ...options, baseUrl: server.url });

    await expect(
      client.completeStructured({ system: "s", prompt: "p", schema, schemaName: "emit" }),
    ).rejects.toThrow(/refused/);
  });
});

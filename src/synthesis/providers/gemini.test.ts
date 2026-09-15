import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { GeminiClient } from "./gemini.js";
import { startMockServer, type MockServer } from "../../testing/mock-server.js";

const schema = z.object({ answer: z.string() });
const options = { apiKey: "test-key", model: "test-model", maxTokens: 100, timeoutMs: 1_000 };

let server: MockServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("GeminiClient", () => {
  it("posts to generateContent with a key header and parses candidate text", async () => {
    server = await startMockServer(() => ({
      json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: "ok" }) }] } }] },
    }));
    const client = new GeminiClient({ ...options, baseUrl: server.url });

    const result = await client.completeStructured({ system: "s", prompt: "p", schema, schemaName: "emit" });

    expect(client.provider).toBe("gemini");
    expect(result).toEqual({ answer: "ok" });
    expect(server.requests[0]?.headers["x-goog-api-key"]).toBe("test-key");
    expect(server.requests[0]?.path).toContain("/models/test-model:generateContent");

    // Gemini gets JSON mime type but no enforced schema, so the prompt carries it.
    const body = server.requests[0]?.body as {
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    const prompt = body.contents[0]?.parts[0]?.text ?? "";
    expect(prompt).toMatch(/JSON Schema/i);
    expect(prompt).toContain('"answer"');
  });

  it("surfaces provider errors with their status", async () => {
    server = await startMockServer(() => ({ status: 403, json: { error: { message: "quota exceeded" } } }));
    const client = new GeminiClient({ ...options, baseUrl: server.url });

    await expect(
      client.completeStructured({ system: "s", prompt: "p", schema, schemaName: "emit" }),
    ).rejects.toThrow(/quota exceeded/);
  });
});

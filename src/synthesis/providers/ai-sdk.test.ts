import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { AiSdkClient } from "./ai-sdk.js";
import { startMockServer, type MockServer } from "../../testing/mock-server.js";
import { ProviderError, StructuredOutputError } from "../../errors.js";

const schema = z.object({ answer: z.string() });
const request = { system: "s", prompt: "p", schema, schemaName: "emit" };

let server: MockServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

function openaiClient(baseURL: string): AiSdkClient {
  return new AiSdkClient({
    provider: "openai",
    model: "test-model",
    languageModel: createOpenAI({ apiKey: "test-key", baseURL }).chat("test-model"),
    maxTokens: 100,
    timeoutMs: 1_000,
  });
}

/** A complete chat-completions envelope; the SDK validates every field. */
function chatResponse(content: string): unknown {
  return {
    id: "chatcmpl-1",
    object: "chat.completion",
    created: 0,
    model: "test-model",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
  };
}

describe("AiSdkClient", () => {
  it("parses a chat-completions response and sends the api key", async () => {
    server = await startMockServer(() => ({ json: chatResponse(JSON.stringify({ answer: "ok" })) }));
    const client = openaiClient(server.url);

    const result = await client.completeStructured(request);

    expect(result).toEqual({ answer: "ok" });
    expect(client.provider).toBe("openai");
    expect(server.requests[0]?.headers["authorization"]).toBe("Bearer test-key");
  });

  it("retries once when the output does not match the schema", async () => {
    server = await startMockServer(() => ({ json: chatResponse(JSON.stringify({ wrong: true })) }));

    await expect(openaiClient(server.url).completeStructured(request)).rejects.toBeInstanceOf(
      StructuredOutputError,
    );
    expect(server.requests).toHaveLength(2);
  });

  it("surfaces provider errors", async () => {
    server = await startMockServer(() => ({ status: 401, json: { error: { message: "invalid key" } } }));

    await expect(openaiClient(server.url).completeStructured(request)).rejects.toBeInstanceOf(ProviderError);
  });

  it("parses an Anthropic tool_use response", async () => {
    server = await startMockServer(() => ({
      json: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "test-model",
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
        // The Anthropic provider forces a tool named "json".
        content: [{ type: "tool_use", id: "toolu_1", name: "json", input: { answer: "ok" } }],
      },
    }));
    const client = new AiSdkClient({
      provider: "anthropic",
      model: "test-model",
      languageModel: createAnthropic({ apiKey: "test-key", baseURL: server.url })("test-model"),
      maxTokens: 100,
      timeoutMs: 1_000,
    });

    await expect(client.completeStructured(request)).resolves.toEqual({ answer: "ok" });
    expect(server.requests[0]?.headers["x-api-key"]).toBe("test-key");
  });
});

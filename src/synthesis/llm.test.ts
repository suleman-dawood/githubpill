import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { AnthropicClient } from "./llm.js";

interface RequestBody {
  temperature?: number;
  tool_choice?: { type: string; name: string };
  tools?: Array<{ input_schema: { type?: string } }>;
}

let server: Server;
let baseUrl: string;
let lastBody: RequestBody | undefined;

beforeAll(async () => {
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      lastBody = JSON.parse(body) as RequestBody;
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({ content: [{ type: "tool_use", name: "emit", input: { answer: "ok" } }] }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
});

describe("AnthropicClient", () => {
  it("forces tool use at temperature 0 and parses the result", async () => {
    const client = new AnthropicClient({ apiKey: "test-key", model: "test-model", baseUrl });
    const schema = z.object({ answer: z.string() });

    const result = await client.completeStructured({
      system: "be terse",
      prompt: "answer",
      schema,
      schemaName: "emit",
    });

    expect(result).toEqual({ answer: "ok" });
    expect(lastBody?.temperature).toBe(0);
    expect(lastBody?.tool_choice).toEqual({ type: "tool", name: "emit" });
    expect(lastBody?.tools?.[0]?.input_schema.type).toBe("object");
  });

  it("rejects when the endpoint is unreachable", async () => {
    const client = new AnthropicClient({ apiKey: "test-key", model: "test-model", baseUrl: "http://127.0.0.1:1" });
    await expect(
      client.completeStructured({
        system: "s",
        prompt: "p",
        schema: z.object({ answer: z.string() }),
        schemaName: "emit",
      }),
    ).rejects.toThrow();
  });
});

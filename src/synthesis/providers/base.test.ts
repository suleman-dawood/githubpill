import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BaseLLMClient } from "./base.js";
import { ProviderError } from "../../errors.js";
import type { ProviderId } from "../../types.js";
import type { ProviderOptions } from "./types.js";

const options: ProviderOptions = { apiKey: "k", model: "m", maxTokens: 10, timeoutMs: 1_000 };
const schema = z.object({ n: z.number() });
const request = { system: "s", prompt: "p", schema, schemaName: "emit" };

class Scripted extends BaseLLMClient {
  readonly provider: ProviderId = "anthropic";
  calls = 0;
  constructor(private readonly results: unknown[]) {
    super(options);
  }
  protected async send(): Promise<unknown> {
    return this.results[this.calls++];
  }
}

class Throwing extends BaseLLMClient {
  readonly provider: ProviderId = "openai";
  calls = 0;
  constructor() {
    super(options);
  }
  protected async send(): Promise<unknown> {
    this.calls += 1;
    throw new ProviderError("upstream down", "openai", 500);
  }
}

describe("BaseLLMClient", () => {
  it("retries once when the response does not match the schema", async () => {
    const client = new Scripted([{ n: "wrong" }, { n: 1 }]);
    await expect(client.completeStructured(request)).resolves.toEqual({ n: 1 });
    expect(client.calls).toBe(2);
  });

  it("does not retry transport or provider errors", async () => {
    const client = new Throwing();
    await expect(client.completeStructured(request)).rejects.toThrow(/upstream down/);
    expect(client.calls).toBe(1);
  });

  it("gives up after the retry and reports the validation failure", async () => {
    const client = new Scripted([{ n: "wrong" }, { n: "still wrong" }]);
    await expect(client.completeStructured(request)).rejects.toThrow(/did not match/);
    expect(client.calls).toBe(2);
  });
});

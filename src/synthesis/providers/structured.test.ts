import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  parseStructuredText,
  toStrictJsonSchema,
  validateStructured,
  withStructuredRetry,
} from "./structured.js";
import { ProviderError, StructuredOutputError } from "../../errors.js";

describe("withStructuredRetry", () => {
  it("retries once after a schema mismatch", async () => {
    let calls = 0;
    const result = await withStructuredRetry(async () => {
      calls += 1;
      if (calls === 1) throw new StructuredOutputError("bad shape", "anthropic");
      return "ok";
    });
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  it("does not retry transport or provider errors", async () => {
    let calls = 0;
    await expect(
      withStructuredRetry(async () => {
        calls += 1;
        throw new ProviderError("upstream down", "openai", 500);
      }),
    ).rejects.toThrow(/upstream down/);
    expect(calls).toBe(1);
  });

  it("gives up after the retry and surfaces the mismatch", async () => {
    let calls = 0;
    await expect(
      withStructuredRetry(async () => {
        calls += 1;
        throw new StructuredOutputError("bad shape", "gemini");
      }),
    ).rejects.toThrow(StructuredOutputError);
    expect(calls).toBe(2);
  });
});

describe("toStrictJsonSchema", () => {
  it("marks nested objects strict", () => {
    const json = JSON.stringify(
      toStrictJsonSchema(z.object({ outer: z.object({ inner: z.string() }) })),
    );
    expect(json).toContain('"additionalProperties":false');
    expect(json).toContain('"required":["inner"]');
  });
});

describe("parseStructuredText", () => {
  it("throws a retryable error on malformed JSON", () => {
    expect(() => parseStructuredText("{not json", "openai")).toThrow(StructuredOutputError);
  });
});

describe("validateStructured", () => {
  it("reports a short, path-labelled mismatch", () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    let message = "";
    try {
      validateStructured(schema, { a: 1, b: "x" }, "deepseek");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("a:");
    expect(message).toContain("b:");
    expect(message.length).toBeLessThan(200);
  });
});

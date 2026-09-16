import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateStructured, withStructuredRetry } from "./structured.js";
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

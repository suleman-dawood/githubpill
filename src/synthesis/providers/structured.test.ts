import { describe, expect, it } from "vitest";
import { withStructuredRetry } from "./structured.js";
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

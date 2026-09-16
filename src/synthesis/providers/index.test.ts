import { describe, expect, it } from "vitest";
import { AiSdkClient } from "./ai-sdk.js";
import { HostClient } from "./host.js";
import { createLLMClient } from "./index.js";

const base = { apiKey: "k", model: "m", maxTokens: 10, timeoutMs: 1_000 };

describe("createLLMClient", () => {
  it("builds an AI SDK client for every API provider", () => {
    expect(createLLMClient({ ...base, provider: "anthropic" })).toBeInstanceOf(AiSdkClient);
    expect(createLLMClient({ ...base, provider: "openai" })).toBeInstanceOf(AiSdkClient);
    expect(createLLMClient({ ...base, provider: "gemini" })).toBeInstanceOf(AiSdkClient);
    expect(createLLMClient({ ...base, provider: "deepseek" })).toBeInstanceOf(AiSdkClient);
  });

  it("keeps the provider identity and model", () => {
    const deepseek = createLLMClient({ ...base, provider: "deepseek", model: "deepseek-reasoner" });
    expect(deepseek.provider).toBe("deepseek");
    expect(deepseek.model).toBe("deepseek-reasoner");
  });

  it("uses the host client for the host provider", () => {
    // Force an agent so construction does not depend on what is installed.
    const host = createLLMClient({ ...base, provider: "host", agent: "claude" });
    expect(host).toBeInstanceOf(HostClient);
  });
});

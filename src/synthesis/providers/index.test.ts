import { describe, expect, it } from "vitest";
import { AnthropicClient } from "./anthropic.js";
import { GeminiClient } from "./gemini.js";
import { OpenAICompatibleClient } from "./openai-compatible.js";
import { createLLMClient } from "./index.js";

const base = { apiKey: "k", model: "m", maxTokens: 10, timeoutMs: 1_000 };

describe("createLLMClient", () => {
  it("builds the client matching the provider", () => {
    expect(createLLMClient({ ...base, provider: "anthropic" })).toBeInstanceOf(AnthropicClient);
    expect(createLLMClient({ ...base, provider: "gemini" })).toBeInstanceOf(GeminiClient);
  });

  it("uses the OpenAI-compatible client for OpenAI and DeepSeek", () => {
    expect(createLLMClient({ ...base, provider: "openai" })).toBeInstanceOf(OpenAICompatibleClient);
    expect(createLLMClient({ ...base, provider: "deepseek" })).toBeInstanceOf(OpenAICompatibleClient);
  });

  it("keeps the provider identity and model", () => {
    const deepseek = createLLMClient({ ...base, provider: "deepseek", model: "deepseek-reasoner" });
    expect(deepseek.provider).toBe("deepseek");
    expect(deepseek.model).toBe("deepseek-reasoner");
  });
});

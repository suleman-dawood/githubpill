import { describe, expect, it } from "vitest";
import { AnthropicClient } from "./anthropic.js";
import { GeminiClient } from "./gemini.js";
import { OpenAIClient } from "./openai.js";
import { createLLMClient } from "./index.js";

const base = { apiKey: "k", model: "m", maxTokens: 10, timeoutMs: 1_000 };

describe("createLLMClient", () => {
  it("builds the client matching the provider", () => {
    expect(createLLMClient({ ...base, provider: "anthropic" })).toBeInstanceOf(AnthropicClient);
    expect(createLLMClient({ ...base, provider: "openai" })).toBeInstanceOf(OpenAIClient);
    expect(createLLMClient({ ...base, provider: "gemini" })).toBeInstanceOf(GeminiClient);
  });

  it("carries the model through", () => {
    expect(createLLMClient({ ...base, provider: "openai", model: "gpt-x" }).model).toBe("gpt-x");
  });
});

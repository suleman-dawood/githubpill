import type { LlmConfig } from "../../config.js";
import { ConfigError } from "../../errors.js";
import type { LLMClient, ProviderOptions } from "./types.js";
import { AnthropicClient } from "./anthropic.js";
import { OpenAIClient } from "./openai.js";
import { GeminiClient } from "./gemini.js";

function toOptions(config: LlmConfig): ProviderOptions {
  return {
    apiKey: config.apiKey,
    model: config.model,
    maxTokens: config.maxTokens,
    timeoutMs: config.timeoutMs,
    ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
  };
}

/** Factory: build the LLM client for the configured provider. */
export function createLLMClient(config: LlmConfig): LLMClient {
  const options = toOptions(config);
  switch (config.provider) {
    case "anthropic":
      return new AnthropicClient(options);
    case "openai":
      return new OpenAIClient(options);
    case "gemini":
      return new GeminiClient(options);
    default: {
      const unsupported: never = config.provider;
      throw new ConfigError(`Unsupported provider: ${String(unsupported)}`);
    }
  }
}

export type { LLMClient, ProviderOptions, StructuredRequest } from "./types.js";
export { AnthropicClient } from "./anthropic.js";
export { OpenAIClient } from "./openai.js";
export { GeminiClient } from "./gemini.js";

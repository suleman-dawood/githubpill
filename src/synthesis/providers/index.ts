import type { LlmConfig } from "../../config.js";
import { ConfigError } from "../../errors.js";
import type { LLMClient, ProviderOptions } from "./types.js";
import { AnthropicClient } from "./anthropic.js";
import { GeminiClient } from "./gemini.js";
import { OpenAICompatibleClient } from "./openai-compatible.js";
import { HostClient } from "./host.js";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

function commonOptions(config: LlmConfig): Omit<ProviderOptions, "baseUrl"> {
  return {
    apiKey: config.apiKey,
    model: config.model,
    maxTokens: config.maxTokens,
    timeoutMs: config.timeoutMs,
  };
}

/** Factory: build the LLM client for the configured provider. */
export function createLLMClient(config: LlmConfig): LLMClient {
  const options = commonOptions(config);
  const baseUrl = config.baseUrl;

  switch (config.provider) {
    case "anthropic":
      return new AnthropicClient({ ...options, ...(baseUrl ? { baseUrl } : {}) });
    case "gemini":
      return new GeminiClient({ ...options, ...(baseUrl ? { baseUrl } : {}) });
    case "openai":
      return new OpenAICompatibleClient({
        ...options,
        provider: "openai",
        jsonMode: "json_schema",
        baseUrl: baseUrl ?? OPENAI_BASE_URL,
      });
    case "deepseek":
      return new OpenAICompatibleClient({
        ...options,
        provider: "deepseek",
        jsonMode: "json_object",
        baseUrl: baseUrl ?? DEEPSEEK_BASE_URL,
      });
    case "host":
      return new HostClient({ ...options, ...(config.agent ? { agent: config.agent } : {}) });
    default: {
      const unsupported: never = config.provider;
      throw new ConfigError(`Unsupported provider: ${String(unsupported)}`);
    }
  }
}

export type { LLMClient, ProviderOptions, StructuredRequest } from "./types.js";
export { AnthropicClient } from "./anthropic.js";
export { GeminiClient } from "./gemini.js";
export { OpenAICompatibleClient } from "./openai-compatible.js";
export { HostClient, resolveHost } from "./host.js";

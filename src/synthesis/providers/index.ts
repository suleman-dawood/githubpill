import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { LlmConfig } from "../../config.js";
import { ConfigError } from "../../errors.js";
import { AiSdkClient } from "./ai-sdk.js";
import { HostClient } from "./host.js";
import type { LLMClient } from "./types.js";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

/** Build the AI SDK language model for a non-host provider. */
function languageModelFor(config: LlmConfig): LanguageModel {
  const { apiKey, baseUrl, model, provider } = config;

  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) })(model);
    case "openai":
      return createOpenAI({ apiKey, baseURL: baseUrl ?? OPENAI_BASE_URL }).chat(model);
    case "deepseek":
      return createOpenAICompatible({
        name: "deepseek",
        apiKey,
        baseURL: baseUrl ?? DEEPSEEK_BASE_URL,
      })(model);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) })(model);
    case "host":
      throw new ConfigError("the host provider does not use an API model");
    default: {
      const unsupported: never = provider;
      throw new ConfigError(`Unsupported provider: ${String(unsupported)}`);
    }
  }
}

/** Factory: build the LLM client for the configured provider. */
export function createLLMClient(config: LlmConfig): LLMClient {
  if (config.provider === "host") {
    return new HostClient({
      apiKey: config.apiKey,
      model: config.model,
      maxTokens: config.maxTokens,
      timeoutMs: config.timeoutMs,
      ...(config.agent ? { agent: config.agent } : {}),
    });
  }

  return new AiSdkClient({
    provider: config.provider,
    model: config.model,
    languageModel: languageModelFor(config),
    maxTokens: config.maxTokens,
    timeoutMs: config.timeoutMs,
    // DeepSeek enforces JSON syntax but not a schema, so the prompt must carry it.
    ...(config.provider === "deepseek" ? { schemaInPrompt: true } : {}),
  });
}

export type { LLMClient, ProviderOptions, StructuredRequest } from "./types.js";
export { AiSdkClient } from "./ai-sdk.js";
export { HostClient, resolveHost } from "./host.js";

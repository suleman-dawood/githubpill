import { generateObject, NoObjectGeneratedError, type LanguageModel } from "ai";
import { ProviderError, StructuredOutputError } from "../../errors.js";
import type { ProviderId } from "../../types.js";
import { withStructuredRetry } from "./structured.js";
import type { LLMClient, StructuredRequest } from "./types.js";

export interface AiSdkClientOptions {
  provider: ProviderId;
  model: string;
  languageModel: LanguageModel;
  maxTokens: number;
  timeoutMs: number;
}

/**
 * Structured output through the Vercel AI SDK. The SDK owns each provider's
 * transport and envelope (forced tool use, JSON schema, JSON mode); this class
 * only maps our request/response shape onto `generateObject`.
 */
export class AiSdkClient implements LLMClient {
  readonly provider: ProviderId;
  readonly model: string;

  private readonly languageModel: LanguageModel;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor(options: AiSdkClientOptions) {
    this.provider = options.provider;
    this.model = options.model;
    this.languageModel = options.languageModel;
    this.maxTokens = options.maxTokens;
    this.timeoutMs = options.timeoutMs;
  }

  completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    return withStructuredRetry(async () => {
      try {
        const { object } = await generateObject({
          model: this.languageModel,
          schema: request.schema,
          schemaName: request.schemaName,
          system: request.system,
          prompt: request.prompt,
          temperature: 0,
          maxOutputTokens: request.maxTokens ?? this.maxTokens,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(this.timeoutMs),
        });
        return object as T;
      } catch (error) {
        throw toProviderError(error, this.provider);
      }
    });
  }
}

function toProviderError(error: unknown, provider: ProviderId): Error {
  if (NoObjectGeneratedError.isInstance(error)) {
    return new StructuredOutputError(`response did not match the schema (${error.message})`, provider);
  }
  if (error instanceof Error) return new ProviderError(error.message, provider);
  return new ProviderError(String(error), provider);
}

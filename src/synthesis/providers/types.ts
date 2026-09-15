import type { z } from "zod";
import type { ProviderId } from "../../types.js";

export interface StructuredRequest<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
  maxTokens?: number;
}

/**
 * The one capability the synthesis step needs from a model: a completion that
 * conforms to a Zod schema. Providers differ only in transport and envelope —
 * the strategy interface keeps that difference out of the pipeline.
 */
export interface LLMClient {
  readonly provider: ProviderId;
  readonly model: string;
  completeStructured<T>(request: StructuredRequest<T>): Promise<T>;
}

export interface ProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens: number;
  timeoutMs: number;
}

import type { ProviderId } from "../../types.js";
import { StructuredOutputError } from "../../errors.js";
import type { LLMClient, ProviderOptions, StructuredRequest } from "./types.js";
import { validateStructured } from "./structured.js";

const ATTEMPTS = 2;

/**
 * Template Method for structured completions: call `send`, validate the result
 * against the schema, and retry once when the model returns something that does
 * not match. Providers implement `send` and nothing else.
 *
 * Retries are limited to `StructuredOutputError` — a second attempt is worth it
 * for malformed model output, but pointless for auth or transport failures,
 * which the HTTP layer already retries.
 */
export abstract class BaseLLMClient implements LLMClient {
  abstract readonly provider: ProviderId;
  readonly model: string;
  protected readonly options: ProviderOptions;

  protected constructor(options: ProviderOptions) {
    this.options = options;
    this.model = options.model;
  }

  /** Perform the provider call and return the raw structured object. */
  protected abstract send(request: StructuredRequest<unknown>): Promise<unknown>;

  async completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      try {
        const raw = await this.send(request as StructuredRequest<unknown>);
        return validateStructured(request.schema, raw, this.provider);
      } catch (error) {
        const lastAttempt = attempt === ATTEMPTS - 1;
        if (!(error instanceof StructuredOutputError) || lastAttempt) throw error;
      }
    }
    // Unreachable: the loop either returns or throws.
    throw new StructuredOutputError("structured completion failed", this.provider);
  }
}

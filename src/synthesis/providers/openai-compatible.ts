import { httpPost, parseJson } from "../../adapters/http.js";
import { ProviderError } from "../../errors.js";
import type { ProviderId } from "../../types.js";
import { errorMessage } from "./response.js";
import { parseStructuredText, toStrictJsonSchema, validateStructured, withStructuredRetry } from "./structured.js";
import type { LLMClient, ProviderOptions, StructuredRequest } from "./types.js";

export type JsonMode = "json_schema" | "json_object";

export interface OpenAICompatibleOptions extends ProviderOptions {
  /** The provider this instance represents, for error messages. */
  provider: ProviderId;
  /**
   * `json_schema` asks for a strict schema (OpenAI). `json_object` only asks
   * for valid JSON (DeepSeek and other compatible gateways); the Zod schema
   * still enforces the shape.
   */
  jsonMode: JsonMode;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
}

/**
 * The Chat Completions dialect shared by OpenAI, DeepSeek, and most gateways.
 * One class covers them; the factory supplies the provider, base URL, and
 * JSON mode.
 */
export class OpenAICompatibleClient implements LLMClient {
  readonly provider: ProviderId;
  readonly model: string;

  constructor(private readonly options: OpenAICompatibleOptions) {
    this.provider = options.provider;
    this.model = options.model;
  }

  async completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    return withStructuredRetry(async () => {
      const raw = await this.send(request);
      return validateStructured(request.schema, raw, this.provider);
    });
  }

  private async send(request: StructuredRequest<unknown>): Promise<unknown> {
    const response = await httpPost(
      `${this.options.baseUrl}/chat/completions`,
      {
        model: this.model,
        temperature: 0,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: this.userPrompt(request) },
        ],
        response_format: this.responseFormat(request),
      },
      {
        headers: { authorization: `Bearer ${this.options.apiKey}` },
        timeoutMs: this.options.timeoutMs,
      },
    );

    if (!response.ok) {
      throw new ProviderError(errorMessage(response.text, response.status), this.provider, response.status);
    }

    const data = parseJson<ChatCompletionResponse>(response);
    const message = data.choices?.[0]?.message;
    if (message?.refusal) {
      throw new ProviderError(`model refused the request: ${message.refusal}`, this.provider, response.status);
    }
    if (!message?.content) {
      throw new ProviderError("response contained no content", this.provider, response.status);
    }
    return parseStructuredText(message.content, this.provider);
  }

  /** JSON-object mode needs the word "json" in the prompt, so say it plainly. */
  private userPrompt(request: StructuredRequest<unknown>): string {
    if (this.options.jsonMode === "json_object") {
      return `${request.prompt}\n\nRespond with a single JSON object and nothing else.`;
    }
    return request.prompt;
  }

  private responseFormat(request: StructuredRequest<unknown>): Record<string, unknown> {
    if (this.options.jsonMode === "json_object") return { type: "json_object" };
    return {
      type: "json_schema",
      json_schema: {
        name: request.schemaName,
        strict: true,
        schema: toStrictJsonSchema(request.schema),
      },
    };
  }
}

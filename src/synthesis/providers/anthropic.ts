import { httpPost, parseJson } from "../../adapters/http.js";
import { ProviderError } from "../../errors.js";
import type { ProviderId } from "../../types.js";
import { errorMessage } from "./response.js";
import { toJsonSchema, validateStructured, withStructuredRetry } from "./structured.js";
import type { LLMClient, ProviderOptions, StructuredRequest } from "./types.js";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const API_VERSION = "2023-06-01";

interface MessagesResponse {
  content?: Array<{ type: string; input?: unknown }>;
}

/** Anthropic Messages API, using forced tool use for structured output. */
export class AnthropicClient implements LLMClient {
  readonly provider: ProviderId = "anthropic";
  readonly model: string;

  constructor(private readonly options: ProviderOptions) {
    this.model = options.model;
  }

  async completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    return withStructuredRetry(async () => {
      const raw = await this.send(request);
      return validateStructured(request.schema, raw, this.provider);
    });
  }

  private async send(request: StructuredRequest<unknown>): Promise<unknown> {
    const baseUrl = this.options.baseUrl ?? DEFAULT_BASE_URL;
    const response = await httpPost(
      `${baseUrl}/v1/messages`,
      {
        model: this.model,
        max_tokens: request.maxTokens ?? this.options.maxTokens,
        temperature: 0,
        system: request.system,
        messages: [{ role: "user", content: request.prompt }],
        tools: [
          {
            name: request.schemaName,
            description: `Return the ${request.schemaName} result.`,
            input_schema: toJsonSchema(request.schema),
          },
        ],
        tool_choice: { type: "tool", name: request.schemaName },
      },
      {
        headers: { "x-api-key": this.options.apiKey, "anthropic-version": API_VERSION },
        timeoutMs: this.options.timeoutMs,
      },
    );

    if (!response.ok) {
      throw new ProviderError(errorMessage(response.text, response.status), this.provider, response.status);
    }

    const data = parseJson<MessagesResponse>(response);
    const toolUse = data.content?.find((block) => block.type === "tool_use");
    if (!toolUse?.input) {
      throw new ProviderError("response contained no tool_use block", this.provider, response.status);
    }
    return toolUse.input;
  }
}

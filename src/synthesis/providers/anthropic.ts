import { httpPost, parseJson } from "../../adapters/http.js";
import { ProviderError } from "../../errors.js";
import type { ProviderId } from "../../types.js";
import { BaseLLMClient } from "./base.js";
import { errorMessage } from "./response.js";
import { jsonSchema } from "./structured.js";
import type { ProviderOptions, StructuredRequest } from "./types.js";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const API_VERSION = "2023-06-01";

interface MessagesResponse {
  content?: Array<{ type: string; input?: unknown }>;
}

/** Anthropic Messages API, using forced tool use for structured output. */
export class AnthropicClient extends BaseLLMClient {
  readonly provider: ProviderId = "anthropic";

  constructor(options: ProviderOptions) {
    super(options);
  }

  protected async send(request: StructuredRequest<unknown>): Promise<unknown> {
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
            input_schema: jsonSchema(request.schema),
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

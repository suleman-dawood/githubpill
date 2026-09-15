import { httpPost, parseJson } from "../../adapters/http.js";
import { ProviderError } from "../../errors.js";
import type { ProviderId } from "../../types.js";
import { BaseLLMClient } from "./base.js";
import { errorMessage } from "./response.js";
import { parseStructuredText, strictJsonSchema } from "./structured.js";
import type { ProviderOptions, StructuredRequest } from "./types.js";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
}

/**
 * OpenAI Chat Completions with `response_format: json_schema`. Any
 * OpenAI-compatible gateway can be used by setting the base URL.
 */
export class OpenAIClient extends BaseLLMClient {
  readonly provider: ProviderId = "openai";

  constructor(options: ProviderOptions) {
    super(options);
  }

  protected async send(request: StructuredRequest<unknown>): Promise<unknown> {
    const baseUrl = this.options.baseUrl ?? DEFAULT_BASE_URL;
    const response = await httpPost(
      `${baseUrl}/chat/completions`,
      {
        model: this.model,
        temperature: 0,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: strictJsonSchema(request.schema),
          },
        },
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
}

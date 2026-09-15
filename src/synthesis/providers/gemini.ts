import { httpPost, parseJson } from "../../adapters/http.js";
import { ProviderError } from "../../errors.js";
import type { ProviderId } from "../../types.js";
import { BaseLLMClient } from "./base.js";
import { errorMessage } from "./response.js";
import { parseStructuredText } from "./structured.js";
import type { ProviderOptions, StructuredRequest } from "./types.js";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

interface GenerateContentResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

/**
 * Google Gemini generateContent. Uses JSON response mode rather than a
 * response schema, because Gemini's schema dialect is a subset of JSON Schema;
 * the shared Zod validation enforces the contract instead.
 */
export class GeminiClient extends BaseLLMClient {
  readonly provider: ProviderId = "gemini";

  constructor(options: ProviderOptions) {
    super(options);
  }

  protected async send(request: StructuredRequest<unknown>): Promise<unknown> {
    const baseUrl = this.options.baseUrl ?? DEFAULT_BASE_URL;
    const url = `${baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`;
    const response = await httpPost(
      url,
      {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          maxOutputTokens: request.maxTokens ?? this.options.maxTokens,
        },
      },
      {
        // Key in a header, not the query string, so it cannot leak into logs.
        headers: { "x-goog-api-key": this.options.apiKey },
        timeoutMs: this.options.timeoutMs,
      },
    );

    if (!response.ok) {
      throw new ProviderError(errorMessage(response.text, response.status), this.provider, response.status);
    }

    const data = parseJson<GenerateContentResponse>(response);
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("");
    if (!text) {
      throw new ProviderError("response contained no content", this.provider, response.status);
    }
    return parseStructuredText(text, this.provider);
  }
}

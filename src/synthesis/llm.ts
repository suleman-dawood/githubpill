import { z } from "zod";

export interface StructuredRequest<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
  maxTokens?: number;
}

/**
 * The one LLM capability the pipeline needs: a structured completion.
 * Swap providers by implementing this interface — nothing downstream changes.
 */
export interface LLMClient {
  readonly model: string;
  completeStructured<T>(request: StructuredRequest<T>): Promise<T>;
}

export interface AnthropicClientOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
}

/**
 * Anthropic Messages API with forced tool use for structured output. Plain
 * `fetch` keeps the dependency surface to zod alone.
 */
export class AnthropicClient implements LLMClient {
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxTokens: number;

  constructor(options: AnthropicClientOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl ?? "https://api.anthropic.com";
    this.maxTokens = options.maxTokens ?? 4096;
  }

  async completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    const { $schema: _ignored, ...inputSchema } = z.toJSONSchema(request.schema) as Record<string, unknown>;

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? this.maxTokens,
        temperature: 0,
        system: request.system,
        messages: [{ role: "user", content: request.prompt }],
        tools: [
          {
            name: request.schemaName,
            description: `Return the ${request.schemaName} result.`,
            input_schema: inputSchema,
          },
        ],
        tool_choice: { type: "tool", name: request.schemaName },
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API returned ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as { content?: Array<{ type: string; input?: unknown }> };
    const toolUse = data.content?.find((block) => block.type === "tool_use");
    if (!toolUse?.input) throw new Error("Anthropic response contained no tool_use block");

    return request.schema.parse(toolUse.input);
  }
}

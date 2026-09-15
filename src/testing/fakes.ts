import type { Config } from "../config.js";
import type { Candidate, ProviderId, RawHit, SourceId, Verification } from "../types.js";
import type { LLMClient, StructuredRequest } from "../synthesis/providers/types.js";
import type { SearchOptions, SourceAdapter } from "../adapters/types.js";

export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    llm: {
      provider: "anthropic",
      apiKey: "test-key",
      model: "fake-model",
      maxTokens: 1024,
      timeoutMs: 1_000,
    },
    sources: ["github", "npm", "pypi", "hackernews"],
    perSourceLimit: 5,
    maxCandidates: 5,
    concurrency: 2,
    requestTimeoutMs: 1_000,
    maxQueriesPerSource: 2,
    llmQueries: false,
    deepCandidates: 3,
    cloneTimeoutMs: 1_000,
    deepMaxFiles: 5,
    deepMaxFileLines: 50,
    logLevel: "silent",
    ...overrides,
  };
}

/** Returns a preset object for the requested schema name, parsed by the schema. */
export class FakeLLM implements LLMClient {
  readonly provider: ProviderId = "anthropic";
  readonly model = "fake-model";

  constructor(private readonly responses: Record<string, unknown> = {}) {}

  async completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    const preset = this.responses[request.schemaName] ?? {};
    return request.schema.parse(preset);
  }
}

export interface FakeAdapterOptions {
  id?: SourceId;
  hits?: RawHit[];
  verifyOk?: boolean;
  /** Explicit verify status, e.g. 403 to simulate a rate limit. */
  verifyStatus?: number;
}

export class FakeAdapter implements SourceAdapter {
  readonly id: SourceId;
  readonly label: string;

  constructor(private readonly options: FakeAdapterOptions = {}) {
    this.id = options.id ?? "github";
    this.label = this.id;
  }

  async search(query: string, _options: SearchOptions): Promise<RawHit[]> {
    return (this.options.hits ?? []).map((raw) => ({ ...raw, query }));
  }

  async verify(_candidate: Candidate, _options: SearchOptions): Promise<Verification> {
    const status = this.options.verifyStatus ?? ((this.options.verifyOk ?? true) ? 200 : 404);
    return {
      ok: status >= 200 && status < 400,
      status,
      checkedAt: new Date().toISOString(),
    };
  }
}

export function hit(partial: Partial<RawHit> & { id: string }): RawHit {
  return {
    source: "github",
    name: partial.id,
    url: `https://github.com/${partial.id}`,
    description: "",
    rank: 0,
    ...partial,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

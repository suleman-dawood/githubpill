import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DEFAULT_MODELS, type LlmConfig } from "../../config.js";
import type { ProviderId } from "../../types.js";
import { commandExists } from "./host.js";
import { createLLMClient } from "./index.js";

/**
 * These tests hit real models. They are excluded from `npm test` and only run
 * via `npm run test:integration`. Any provider without credentials is skipped,
 * so the suite passes on a machine with no keys as long as one host CLI exists.
 */

const schema = z.object({ country: z.string(), capital: z.string() });
const request = {
  system: "You answer with JSON only.",
  prompt: "What is the capital of France?",
  schema,
  schemaName: "answer",
};

/** Env var that supplies each API provider's key. */
const API_KEY_ENV: Partial<Record<ProviderId, string>> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

function configFor(provider: ProviderId, apiKey: string, agent?: string): LlmConfig {
  return {
    provider,
    apiKey,
    model: DEFAULT_MODELS[provider],
    maxTokens: 256,
    timeoutMs: 120_000,
    ...(agent ? { agent } : {}),
  };
}

describe("API providers", () => {
  for (const [provider, envVar] of Object.entries(API_KEY_ENV) as Array<[ProviderId, string]>) {
    const apiKey = process.env[envVar];
    it.skipIf(!apiKey)(`${provider} completes a structured request`, async () => {
      const result = await createLLMClient(configFor(provider, apiKey as string)).completeStructured(request);
      expect(result.capital.toLowerCase()).toContain("paris");
    });
  }
});

describe("host provider", () => {
  const agent =
    process.env.GITHUBPILL_AGENT ?? (commandExists("opencode") ? "opencode" : undefined);

  it.skipIf(!agent)(`${agent ?? "host"} completes a structured request`, async () => {
    const result = await createLLMClient(configFor("host", "", agent)).completeStructured(request);
    expect(result.capital.toLowerCase()).toContain("paris");
  });
});

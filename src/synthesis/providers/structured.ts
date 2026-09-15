import { z } from "zod";
import { StructuredOutputError } from "../../errors.js";
import type { ProviderId } from "../../types.js";

/** Convert a Zod schema to JSON Schema, minus the `$schema` key APIs reject. */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _schema, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest;
}

/**
 * OpenAI's strict structured-output mode requires every object to set
 * `additionalProperties: false` and to list all of its keys in `required`.
 */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return makeStrict(toJsonSchema(schema)) as Record<string, unknown>;
}

function makeStrict(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(makeStrict);
  if (node === null || typeof node !== "object") return node;

  const object = { ...(node as Record<string, unknown>) };
  for (const key of Object.keys(object)) object[key] = makeStrict(object[key]);

  if (object.type === "object" && object.properties && typeof object.properties === "object") {
    object.additionalProperties = false;
    object.required = Object.keys(object.properties as Record<string, unknown>);
  }
  return object;
}

/** Validate a provider response against the requested schema. */
export function validateStructured<T>(schema: z.ZodType<T>, raw: unknown, provider: ProviderId): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new StructuredOutputError(
      `response did not match the requested schema: ${parsed.error.message}`,
      provider,
    );
  }
  return parsed.data;
}

/** Parse a provider's JSON text, treating malformed output as retryable. */
export function parseStructuredText(text: string, provider: ProviderId): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new StructuredOutputError(`provider returned invalid JSON: ${(error as Error).message}`, provider);
  }
}

/**
 * Run an attempt, and retry it once if the model returned output that did not
 * match the schema. A second try usually fixes malformed JSON; auth and
 * transport failures are not retried here (the HTTP layer handles those).
 */
export async function withStructuredRetry<T>(attempt: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (error instanceof StructuredOutputError) return attempt();
    throw error;
  }
}

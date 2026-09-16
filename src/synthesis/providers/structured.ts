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
    const detail = parsed.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new StructuredOutputError(`response did not match the schema (${detail})`, provider);
  }
  return parsed.data;
}

/**
 * Append the JSON Schema to a prompt. Providers that cannot enforce a schema
 * (OpenAI-compatible JSON mode, Gemini JSON mime type) need the field names in
 * the prompt or the model invents its own shape.
 */
export function withJsonSchemaInstruction(prompt: string, schema: z.ZodType): string {
  return [
    prompt,
    "",
    "Respond with a single JSON object that matches this JSON Schema exactly:",
    JSON.stringify(toJsonSchema(schema), null, 2),
  ].join("\n");
}

/** Parse a provider's JSON text, treating malformed output as retryable. */
export function parseStructuredText(text: string, provider: ProviderId): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new StructuredOutputError(`provider returned invalid JSON: ${(error as Error).message}`, provider);
  }
}

function tryParse(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Slice a brace-balanced object from `start`, ignoring braces inside strings. */
function balancedObject(text: string, start: number): string | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i] as string;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return undefined;
}

/**
 * Pull the first JSON object out of text that may include ANSI codes, prose, or
 * a fenced code block — agentic CLIs do not guarantee bare JSON on stdout.
 */
export function extractJson(text: string, provider: ProviderId): unknown {
  const cleaned = text.replace(/\u001b\[[0-9;]*m/g, "").trim();

  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidates = [fence, cleaned].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    const parsed = tryParse(candidate);
    if (parsed !== undefined) return parsed;
  }

  const start = cleaned.indexOf("{");
  if (start >= 0) {
    const candidate = balancedObject(cleaned, start);
    const parsed = candidate === undefined ? undefined : tryParse(candidate);
    if (parsed !== undefined) return parsed;
  }

  throw new StructuredOutputError("no JSON object found in the response", provider);
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

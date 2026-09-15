import type { ProviderId } from "./types.js";

/**
 * Base class for every error this package throws on purpose. Callers can catch
 * `GithubPillError` to distinguish expected failures from bugs.
 */
export class GithubPillError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Invalid or missing configuration (bad provider, absent key, unparsable value). */
export class ConfigError extends GithubPillError {}

/** A source API returned an unexpected response. */
export class HttpError extends GithubPillError {
  constructor(
    message: string,
    readonly status: number | null,
    readonly url: string,
  ) {
    super(message);
  }
}

/** An LLM provider call failed (transport, auth, or an unusable response). */
export class ProviderError extends GithubPillError {
  constructor(
    message: string,
    readonly provider: ProviderId,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * The provider responded, but not with an object matching the requested schema.
 * This is the one provider failure worth retrying: models occasionally emit
 * malformed JSON, and a second attempt usually succeeds.
 */
export class StructuredOutputError extends ProviderError {}

import { setTimeout as sleep } from "node:timers/promises";
import pLimit from "p-limit";
import pRetry from "p-retry";
import { HttpError } from "../errors.js";

export interface HttpOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

export interface HttpResponse {
  status: number;
  ok: boolean;
  text: string;
  finalUrl: string;
  headers: Headers;
}

interface RequestSpec {
  method: "GET" | "POST";
  body?: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

function isRetryableStatus(status: number, body: string): boolean {
  if (status === 429 || status >= 500) return true;
  // GitHub signals secondary limits with a 403 and an explanatory body.
  return status === 403 && /rate limit|secondary rate/i.test(body);
}

function baseBackoffMs(attempt: number): number {
  return BASE_BACKOFF_MS * 2 ** attempt;
}

/** Seconds from a `Retry-After` header, if it is present and valid. */
function retryAfterMs(headers: Headers): number | undefined {
  const seconds = Number(headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

/** Signals that an otherwise-complete response should be retried. */
class RetryableResponse extends Error {
  constructor(readonly response: HttpResponse) {
    super(`retryable HTTP ${response.status}`);
  }
}

async function attempt(
  url: string,
  spec: RequestSpec,
  options: HttpOptions,
  timeoutMs: number,
): Promise<HttpResponse> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  const response = await fetch(url, {
    method: spec.method,
    headers: options.headers,
    signal,
    ...(spec.body === undefined ? {} : { body: spec.body }),
  });

  const text = await response.text();
  const result: HttpResponse = {
    status: response.status,
    ok: response.ok,
    text,
    finalUrl: response.url || url,
    headers: response.headers,
  };
  if (!response.ok && isRetryableStatus(response.status, text)) throw new RetryableResponse(result);
  return result;
}

async function request(url: string, spec: RequestSpec, options: HttpOptions): Promise<HttpResponse> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    return await pRetry(() => attempt(url, spec, options, timeoutMs), {
      retries,
      minTimeout: 0,
      factor: 1,
      shouldRetry: () => true,
      onFailedAttempt: async ({ error, attemptNumber, retriesLeft }) => {
        if (retriesLeft <= 0) return;
        const after = error instanceof RetryableResponse ? retryAfterMs(error.response.headers) : undefined;
        await sleep(after ?? baseBackoffMs(attemptNumber - 1));
      },
    });
  } catch (error) {
    // Retries exhausted: surface the last response, or wrap a transport failure.
    if (error instanceof RetryableResponse) return error.response;
    throw new HttpError(`request failed: ${(error as Error).message}`, null, url);
  }
}

export function httpGet(url: string, options: HttpOptions = {}): Promise<HttpResponse> {
  return request(url, { method: "GET" }, options);
}

export function httpPost(url: string, body: unknown, options: HttpOptions = {}): Promise<HttpResponse> {
  return request(
    url,
    { method: "POST", body: JSON.stringify(body) },
    { ...options, headers: { "content-type": "application/json", ...options.headers } },
  );
}

export function parseJson<T>(response: HttpResponse): T {
  try {
    return JSON.parse(response.text) as T;
  } catch {
    throw new HttpError(`invalid JSON from ${response.finalUrl}`, response.status, response.finalUrl);
  }
}

export async function getJson<T>(url: string, options: HttpOptions = {}): Promise<T> {
  const response = await httpGet(url, options);
  if (!response.ok) {
    throw new HttpError(`GET ${url} returned ${response.status}`, response.status, url);
  }
  return parseJson<T>(response);
}

/** Run async work over items with a bounded number of in-flight tasks. */
export function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  return pLimit(Math.max(1, limit)).map(items, (item, index) => fn(item, index));
}

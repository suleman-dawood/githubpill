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

function isRetryable(status: number, body: string): boolean {
  if (status === 429 || status >= 500) return true;
  // GitHub signals secondary limits with a 403 and an explanatory body.
  return status === 403 && /rate limit|secondary rate/i.test(body);
}

function baseBackoffMs(attempt: number): number {
  return BASE_BACKOFF_MS * 2 ** attempt;
}

function backoffMs(attempt: number, headers: Headers): number {
  const retryAfter = Number(headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return baseBackoffMs(attempt);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url: string, spec: RequestSpec, options: HttpOptions): Promise<HttpResponse> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (let attempt = 0; ; attempt += 1) {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await fetch(url, {
        method: spec.method,
        headers: options.headers,
        signal,
        ...(spec.body === undefined ? {} : { body: spec.body }),
      });
    } catch (error) {
      if (attempt < retries) {
        await sleep(baseBackoffMs(attempt));
        continue;
      }
      throw new HttpError(`request failed: ${(error as Error).message}`, null, url);
    }

    const text = await response.text();
    if (!response.ok && isRetryable(response.status, text) && attempt < retries) {
      await sleep(backoffMs(attempt, response.headers));
      continue;
    }

    return {
      status: response.status,
      ok: response.ok,
      text,
      finalUrl: response.url || url,
      headers: response.headers,
    };
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
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index] as T, index);
    }
  });

  await Promise.all(workers);
  return results;
}

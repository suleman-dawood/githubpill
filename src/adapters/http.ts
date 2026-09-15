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

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly url: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;

function isRetryable(status: number, body: string): boolean {
  if (status === 429 || status >= 500) return true;
  // GitHub signals secondary limits with a 403 and an explanatory body.
  return status === 403 && /rate limit|secondary rate/i.test(body);
}

function backoffMs(attempt: number, headers: Headers): number {
  const retryAfter = Number(headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return 500 * 2 ** attempt;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET a URL with a timeout, bounded retries, and 429/5xx backoff. */
export async function httpGet(url: string, options: HttpOptions = {}): Promise<HttpResponse> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (let attempt = 0; ; attempt += 1) {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout;

    let response: Response;
    try {
      response = await fetch(url, { headers: options.headers, signal });
    } catch (error) {
      if (attempt < retries) {
        await sleep(500 * 2 ** attempt);
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

export async function getJson<T>(url: string, options: HttpOptions = {}): Promise<T> {
  const response = await httpGet(url, options);
  if (!response.ok) {
    throw new HttpError(`GET ${url} returned ${response.status}`, response.status, url);
  }
  return JSON.parse(response.text) as T;
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

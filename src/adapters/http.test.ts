import { describe, expect, it, vi } from "vitest";
import { getJson, httpGet, mapLimit } from "./http.js";
import { HttpError } from "../errors.js";

describe("mapLimit", () => {
  it("preserves order and bounds concurrency", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return n * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});

describe("httpGet", () => {
  it("returns the body on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("hello", { status: 200 }));
    const response = await httpGet("https://example.com");
    expect(response.status).toBe(200);
    expect(response.text).toBe("hello");
  });

  it("throws HttpError on a non-retryable status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 404 }));
    await expect(getJson("https://example.com")).rejects.toBeInstanceOf(HttpError);
  });

  it("retries a 500 and then succeeds", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    fetchMock.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const data = await getJson<{ ok: boolean }>("https://example.com");
    expect(data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

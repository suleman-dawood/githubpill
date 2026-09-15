import { describe, expect, it, vi } from "vitest";
import { NpmAdapter } from "./npm.js";
import { jsonResponse, testConfig } from "../testing/fakes.js";

const config = testConfig();

describe("NpmAdapter", () => {
  it("maps registry search results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        objects: [
          {
            package: {
              name: "todo-cli",
              description: "manage todos",
              date: "2025-06-01T00:00:00Z",
              links: { npm: "https://www.npmjs.com/package/todo-cli" },
            },
            score: { final: 0.9 },
          },
        ],
      }),
    );

    const hits = await new NpmAdapter().search("todo", { limit: 5, config });

    expect(hits[0]).toMatchObject({
      id: "todo-cli",
      url: "https://www.npmjs.com/package/todo-cli",
      lastActivity: "2025-06-01T00:00:00Z",
      rank: 0,
      source: "npm",
    });
  });

  it("falls back to a registry URL when links are absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ objects: [{ package: { name: "solo" } }] }),
    );
    const hits = await new NpmAdapter().search("solo", { limit: 5, config });
    expect(hits[0]?.url).toBe("https://www.npmjs.com/package/solo");
  });
});

describe("NpmAdapter.verify", () => {
  const candidate = {
    id: "todo-cli",
    name: "todo-cli",
    url: "https://www.npmjs.com/package/todo-cli",
    description: "",
    sources: ["npm"] as const,
    matchedQueries: [],
    score: 1,
  };

  it("reports a live package", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const result = await new NpmAdapter().verify({ ...candidate, sources: ["npm"] }, { limit: 5, config });
    expect(result.ok).toBe(true);
  });

  it("reports a missing package", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("gone", { status: 404 }));
    const result = await new NpmAdapter().verify({ ...candidate, sources: ["npm"] }, { limit: 5, config });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });
});

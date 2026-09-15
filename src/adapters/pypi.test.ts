import { describe, expect, it, vi } from "vitest";
import { parseSnippets, PyPiAdapter } from "./pypi.js";
import { testConfig } from "../testing/fakes.js";

const HTML = `
<main>
  <a class="package-snippet" href="/project/ndis-validator/">
    <span class="package-snippet__name">ndis-validator</span>
    <p class="package-snippet__description">Validate NDIS invoices</p>
  </a>
  <a class="package-snippet" href="/project/other/">
    <span class="package-snippet__name">other</span>
  </a>
  <a class="package-snippet" href="/project/fallback-name/"></a>
</main>
`;

describe("parseSnippets", () => {
  it("extracts package names and descriptions", () => {
    const results = parseSnippets(HTML);
    expect(results).toEqual([
      { name: "ndis-validator", description: "Validate NDIS invoices" },
      { name: "other", description: "" },
      { name: "fallback-name", description: "" },
    ]);
  });

  it("returns nothing for a page with no results", () => {
    expect(parseSnippets("<main>no results</main>")).toEqual([]);
  });
});

describe("PyPiAdapter", () => {
  it("parses the search page into hits", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(HTML, { status: 200 }));
    const hits = await new PyPiAdapter().search("ndis", { limit: 5, config: testConfig() });
    expect(hits[0]).toMatchObject({ id: "ndis-validator", source: "pypi", rank: 0 });
  });

  it("returns nothing when the search page fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 404 }));
    expect(await new PyPiAdapter().search("x", { limit: 5, config: testConfig() })).toEqual([]);
  });

  it("verifies a package", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const result = await new PyPiAdapter().verify(
      {
        id: "ndis-validator",
        name: "ndis-validator",
        url: "https://pypi.org/project/ndis-validator/",
        description: "",
        sources: ["pypi"],
        matchedQueries: [],
        score: 1,
      },
      { limit: 5, config: testConfig() },
    );
    expect(result.ok).toBe(true);
  });
});

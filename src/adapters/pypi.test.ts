import { describe, expect, it } from "vitest";
import { parseSnippets } from "./pypi.js";

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

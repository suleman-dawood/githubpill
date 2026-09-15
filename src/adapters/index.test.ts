import { describe, expect, it } from "vitest";
import { createAdapters } from "./index.js";

describe("createAdapters", () => {
  it("builds the requested adapters in order", () => {
    expect(createAdapters(["npm", "github"]).map((adapter) => adapter.id)).toEqual(["npm", "github"]);
  });

  it("builds every adapter", () => {
    expect(createAdapters(["github", "npm", "pypi", "hackernews"])).toHaveLength(4);
  });
});

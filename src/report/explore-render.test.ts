import { describe, expect, it } from "vitest";
import { explore } from "../explore.js";
import { renderJson } from "./json.js";
import { renderExplorationHtml } from "./explore-html.js";
import { renderExplorationMarkdown } from "./explore-markdown.js";
import { FakeAdapter, FakeLLM, hit, testConfig } from "../testing/fakes.js";
import type { ExplorationReport } from "../types.js";

async function sampleReport(): Promise<ExplorationReport> {
  const adapter = new FakeAdapter({
    hits: [hit({ id: "acme/tui", description: "a <tui> file manager", stars: 42 })],
  });
  const llm = new FakeLLM({
    exploration: {
      summary: "A crowded space.",
      clusters: [{ theme: "TUIs", summary: "Terminal managers.", candidateIds: ["acme/tui"] }],
      gaps: [{ observation: "None is Rust-based.", candidateIds: ["acme/tui"] }],
      directions: [{ idea: "A Rust TUI", why: "All are C.", groundedIn: ["acme/tui"] }],
    },
  });
  const { report } = await explore({
    topic: "terminal file manager",
    llm,
    config: testConfig(),
    adapters: [adapter],
  });
  return report;
}

describe("exploration renderers", () => {
  it("renders JSON that round-trips", async () => {
    const report = await sampleReport();
    const parsed = JSON.parse(renderJson(report)) as ExplorationReport;
    expect(parsed.clusters).toHaveLength(1);
  });

  it("renders markdown with clusters, gaps, and directions", async () => {
    const markdown = renderExplorationMarkdown(await sampleReport());
    expect(markdown).toContain("# Landscape");
    expect(markdown).toContain("## Clusters");
    expect(markdown).toContain("## Gaps");
    expect(markdown).toContain("## Directions");
    expect(markdown).toContain("acme/tui");
  });

  it("renders HTML and escapes descriptions", async () => {
    const html = renderExplorationHtml(await sampleReport());
    expect(html).toContain("https://github.com/acme/tui");
    expect(html).toContain("a &lt;tui&gt; file manager");
  });
});

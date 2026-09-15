#!/usr/bin/env node
import { parseArgs } from "node:util";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "./config.js";
import { defaultAdapters } from "./adapters/index.js";
import { AnthropicClient } from "./synthesis/llm.js";
import { run } from "./pipeline.js";
import { renderJson } from "./report/json.js";
import { renderMarkdown } from "./report/markdown.js";
import { renderHtml } from "./report/html.js";
import type { ProgressEvent, Report } from "./types.js";

const HELP = `githubpill — prior-art reconnaissance for project ideas

Usage:
  githubpill [options] "<idea>"

Options:
  --out <dir>            Output directory (default: githubpill-reports)
  --json                 Also write the machine-readable report (.json)
  --html                 Also write the self-contained report (.html)
  --sources <csv>        Restrict sources: github,npm,pypi,hackernews
  --model <id>           Override the LLM model
  --max-candidates <n>   Cap candidates carried into synthesis
  --no-write             Print the verdict only, write no files
  --quiet                Suppress progress output
  -h, --help             Show this help

Environment:
  ANTHROPIC_API_KEY      Required for the synthesis step
  GITHUB_TOKEN / GH_TOKEN  Optional; raises GitHub rate limits (falls back to \`gh auth token\`)
  GITHUBPILL_MODEL       Default model id

Example:
  githubpill "a CLI that previews diffs as a side-by-side TUI"
`;

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || "untitled";
}

function printProgress(event: ProgressEvent): void {
  switch (event.type) {
    case "stage":
      process.stderr.write(`[githubpill] ${event.stage}\n`);
      break;
    case "search":
      process.stderr.write(`  ${event.source}: ${event.query} -> ${event.hits} hits\n`);
      break;
    case "ranked":
      process.stderr.write(`  ranked ${event.count} candidates\n`);
      break;
    case "verify":
      process.stderr.write(`  verify ${event.ok ? "ok" : "DEAD"} ${event.url}\n`);
      break;
    case "done":
      break;
  }
}

async function uniquePath(dir: string, base: string, ext: string): Promise<string> {
  for (let n = 1; ; n += 1) {
    const candidate = join(dir, n === 1 ? `${base}${ext}` : `${base}-${n}${ext}`);
    try {
      await access(candidate);
    } catch {
      return candidate;
    }
  }
}

function verdictBlock(report: Report, written: string[]): string {
  const emoji = { green: "🟢", yellow: "🟡", red: "🔴" }[report.band];
  const lines = [
    `${emoji} ${report.headline}`,
    "",
    `Your idea: "${report.sharpened}"`,
  ];
  const top = report.candidates.slice(0, 3);
  if (top.length === 0) {
    lines.push("No candidate projects found.");
  } else {
    for (const candidate of top) {
      lines.push(`- ${candidate.name} — ${candidate.label} (sum=${candidate.axisSum}) ${candidate.url}`);
    }
  }
  if (written.length > 0) lines.push("", `Report: ${written.join(", ")}`);
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string", default: "githubpill-reports" },
      json: { type: "boolean", default: false },
      html: { type: "boolean", default: false },
      sources: { type: "string" },
      model: { type: "string" },
      "max-candidates": { type: "string" },
      "no-write": { type: "boolean", default: false },
      quiet: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    process.stdout.write(HELP);
    return;
  }
  if (positionals.length === 0) {
    process.stderr.write(HELP);
    process.exitCode = 1;
    return;
  }

  const idea = positionals.join(" ");
  const env = values.sources ? { ...process.env, GITHUBPILL_SOURCES: values.sources } : process.env;
  const config = loadConfig(env);
  if (values.model) config.model = values.model;
  if (values["max-candidates"]) config.maxCandidates = Number(values["max-candidates"]);

  if (!config.anthropicApiKey) {
    process.stderr.write(
      "ERROR: ANTHROPIC_API_KEY is required for the synthesis step. Set it and retry.\n",
    );
    process.exitCode = 1;
    return;
  }

  const llm = new AnthropicClient({
    apiKey: config.anthropicApiKey,
    model: config.model,
    ...(process.env.GITHUBPILL_LLM_BASE_URL ? { baseUrl: process.env.GITHUBPILL_LLM_BASE_URL } : {}),
  });
  const adapters = defaultAdapters(env);
  const { report, errors, dropped } = await run({
    idea,
    llm,
    config,
    adapters,
    ...(values.quiet ? {} : { onProgress: printProgress }),
  });

  if (errors.length > 0) {
    process.stderr.write(`WARN: ${errors.length} query/queries failed and were skipped:\n`);
    for (const error of errors.slice(0, 5)) {
      process.stderr.write(`  ${error.source} "${error.query}": ${error.message}\n`);
    }
  }
  if (dropped.length > 0) {
    process.stderr.write(`WARN: dropped ${dropped.length} candidate(s) that failed verification.\n`);
  }

  const written: string[] = [];
  if (!values["no-write"]) {
    await mkdir(values.out, { recursive: true });
    const base = `${report.generatedAt.slice(0, 10)}-${slugify(report.sharpened)}`;

    const markdownPath = await uniquePath(values.out, base, ".md");
    await writeFile(markdownPath, renderMarkdown(report), "utf8");
    written.push(markdownPath);

    if (values.json) {
      const jsonPath = await uniquePath(values.out, base, ".json");
      await writeFile(jsonPath, renderJson(report), "utf8");
      written.push(jsonPath);
    }
    if (values.html) {
      const htmlPath = await uniquePath(values.out, base, ".html");
      await writeFile(htmlPath, renderHtml(report), "utf8");
      written.push(htmlPath);
    }
  }

  process.stdout.write(verdictBlock(report, written));
}

main().catch((error: unknown) => {
  process.stderr.write(`ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

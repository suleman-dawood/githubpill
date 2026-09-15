#!/usr/bin/env node
import { parseArgs } from "node:util";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig, DEFAULT_MODELS } from "./config.js";
import { createAdapters } from "./adapters/index.js";
import { createLLMClient } from "./synthesis/providers/index.js";
import { validate } from "./validate.js";
import { renderJson } from "./report/json.js";
import { renderMarkdown } from "./report/markdown.js";
import { renderHtml } from "./report/html.js";
import { createLogger } from "./logger.js";
import { ConfigError, GithubPillError } from "./errors.js";
import type { ProgressEvent, Report } from "./types.js";

const HELP = `githubpill — prior-art reconnaissance for project ideas

Usage:
  githubpill [options] "<idea>"

Options:
  --provider <id>        LLM provider: anthropic | openai | gemini
  --model <id>           Model id (default depends on provider)
  --sources <csv>        Sources: github,npm,pypi,hackernews
  --max-candidates <n>   Cap candidates carried into synthesis
  --out <dir>            Output directory (default: githubpill-reports)
  --json                 Also write the machine-readable report (.json)
  --html                 Also write the self-contained report (.html)
  --no-write             Print the verdict only, write no files
  --quiet                Suppress progress output
  -h, --help             Show this help

Providers and API keys (first key found selects the provider):
  anthropic   ANTHROPIC_API_KEY                  default model ${DEFAULT_MODELS.anthropic}
  openai      OPENAI_API_KEY                     default model ${DEFAULT_MODELS.openai}
  gemini      GEMINI_API_KEY or GOOGLE_API_KEY   default model ${DEFAULT_MODELS.gemini}
  deepseek    DEEPSEEK_API_KEY                   default model ${DEFAULT_MODELS.deepseek}

Other environment:
  GITHUB_TOKEN / GH_TOKEN   Optional; raises GitHub rate limits (falls back to \`gh auth token\`)
  GITHUBPILL_PROVIDER       Force a provider instead of auto-detecting
  GITHUBPILL_MODEL          Override the model id
  GITHUBPILL_LOG            silent | error | warn | info | debug

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
  const lines = [`${emoji} ${report.headline}`, "", `Your idea: "${report.sharpened}"`];

  if (report.candidates.length === 0) {
    lines.push("No candidate projects found.");
  } else {
    for (const candidate of report.candidates.slice(0, 3)) {
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
      provider: { type: "string" },
      model: { type: "string" },
      sources: { type: "string" },
      "max-candidates": { type: "string" },
      out: { type: "string", default: "githubpill-reports" },
      json: { type: "boolean", default: false },
      html: { type: "boolean", default: false },
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

  // Route CLI overrides through the same validated config path as env vars.
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (values.provider) env.GITHUBPILL_PROVIDER = values.provider;
  if (values.model) env.GITHUBPILL_MODEL = values.model;
  if (values.sources) env.GITHUBPILL_SOURCES = values.sources;
  if (values["max-candidates"]) env.GITHUBPILL_MAX_CANDIDATES = values["max-candidates"];
  if (values.quiet) env.GITHUBPILL_LOG = "silent";

  const config = loadConfig(env);
  const log = createLogger(config.logLevel);
  const llm = createLLMClient(config.llm);
  const adapters = createAdapters(config.sources);

  log.info(`[githubpill] provider=${llm.provider} model=${llm.model} sources=${config.sources.join(",")}`);

  const onProgress = (event: ProgressEvent): void => {
    switch (event.type) {
      case "stage":
        log.info(`[githubpill] ${event.stage}`);
        break;
      case "search":
        log.info(`  ${event.source}: ${event.query} -> ${event.hits} hits`);
        break;
      case "ranked":
        log.info(`  ranked ${event.count} candidates`);
        break;
      case "verify":
        log.info(`  verify ${event.ok ? "ok" : "DEAD"} ${event.url}`);
        break;
      case "done":
        break;
    }
  };

  const { report, errors, dropped } = await validate({ idea: positionals.join(" "), llm, config, adapters, onProgress });

  if (errors.length > 0) {
    log.warn(`[githubpill] ${errors.length} query/queries failed and were skipped:`);
    for (const error of errors.slice(0, 5)) {
      log.warn(`  ${error.source} "${error.query}": ${error.message}`);
    }
  }
  if (dropped.length > 0) {
    log.warn(`[githubpill] dropped ${dropped.length} candidate(s) that failed verification.`);
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
  if (error instanceof ConfigError) {
    process.stderr.write(`Configuration error: ${error.message}\n`);
  } else if (error instanceof GithubPillError) {
    process.stderr.write(`${error.name}: ${error.message}\n`);
  } else {
    process.stderr.write(`Unexpected error: ${error instanceof Error ? error.message : String(error)}\n`);
  }
  process.exitCode = 1;
});

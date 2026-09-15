#!/usr/bin/env node
import { parseArgs } from "node:util";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig, DEFAULT_MODELS } from "./config.js";
import { createAdapters } from "./adapters/index.js";
import { createLLMClient } from "./synthesis/providers/index.js";
import { validate } from "./validate.js";
import { explore } from "./explore.js";
import { renderJson } from "./report/json.js";
import { renderMarkdown } from "./report/markdown.js";
import { renderHtml } from "./report/html.js";
import { renderExplorationMarkdown } from "./report/explore-markdown.js";
import { renderExplorationHtml } from "./report/explore-html.js";
import { createLogger, type Logger } from "./logger.js";
import { ConfigError, GithubPillError } from "./errors.js";
import type { ExplorationReport, ProgressEvent, Report } from "./types.js";

const HELP = `githubpill — prior-art reconnaissance for project ideas

Usage:
  githubpill [options] "<idea>"             Validate an idea (default)
  githubpill --explore [options] "<space>"  Explore a space for openings

Options:
  --deep                 Clone top candidates and cite file:LINE evidence
  --explore              Explore a space instead of validating an idea
                         (combine with --deep for cloned evidence)
  --provider <id>        LLM provider: anthropic | openai | gemini | deepseek
  --model <id>           Model id (default depends on provider)
  --sources <csv>        Sources: github,npm,pypi,hackernews
  --max-candidates <n>   Cap candidates carried into synthesis
  --out <dir>            Output directory (default: githubpill-reports)
  --json                 Also write the machine-readable report (.json)
  --html                 Also write the self-contained report (.html)
  --no-write             Print the result only, write no files
  --quiet                Suppress progress output
  -h, --help             Show this help

Providers and API keys (first key found selects the provider):
  anthropic   ANTHROPIC_API_KEY                  default model ${DEFAULT_MODELS.anthropic}
  openai      OPENAI_API_KEY                     default model ${DEFAULT_MODELS.openai}
  gemini      GEMINI_API_KEY or GOOGLE_API_KEY   default model ${DEFAULT_MODELS.gemini}
  deepseek    DEEPSEEK_API_KEY                   default model ${DEFAULT_MODELS.deepseek}
  host        (no key) uses an installed agentic CLI: claude, opencode, codex, pi

Other environment:
  GITHUB_TOKEN / GH_TOKEN   Optional; raises GitHub rate limits (falls back to \`gh auth token\`)
  GITHUBPILL_PROVIDER       Force a provider instead of auto-detecting
  GITHUBPILL_MODEL          Override the model id
  GITHUBPILL_AGENT          Agentic CLI for the host provider (claude|opencode|codex|pi)
  GITHUBPILL_LLM_QUERIES    Set to 0 to use the heuristic query planner
  GITHUBPILL_LOG            silent | error | warn | info | debug

Examples:
  githubpill "a CLI that previews diffs as a side-by-side TUI"
  githubpill --deep "a self-hosted RSS reader"
  githubpill --explore "local-first note taking"
  githubpill --deep --explore "local-first note taking"
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

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Find a base filename whose .md/.json/.html variants are all free. */
async function uniqueBase(dir: string, base: string): Promise<string> {
  for (let n = 1; ; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await Promise.all(
      [".md", ".json", ".html"].map((ext) => exists(join(dir, `${candidate}${ext}`))),
    );
    if (!taken.some(Boolean)) return candidate;
  }
}

interface Artifacts {
  markdown: string;
  json: unknown;
  html: string;
}

async function writeReports(
  outDir: string,
  base: string,
  write: boolean,
  flags: { json: boolean; html: boolean },
  artifacts: Artifacts,
): Promise<string[]> {
  if (!write) return [];
  await mkdir(outDir, { recursive: true });
  const stem = await uniqueBase(outDir, base);

  const markdownPath = join(outDir, `${stem}.md`);
  await writeFile(markdownPath, artifacts.markdown, "utf8");
  const written = [markdownPath];

  if (flags.json) {
    const jsonPath = join(outDir, `${stem}.json`);
    await writeFile(jsonPath, renderJson(artifacts.json), "utf8");
    written.push(jsonPath);
  }
  if (flags.html) {
    const htmlPath = join(outDir, `${stem}.html`);
    await writeFile(htmlPath, artifacts.html, "utf8");
    written.push(htmlPath);
  }
  return written;
}

function validationBlock(report: Report, written: string[]): string {
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

function explorationBlock(report: ExplorationReport, written: string[]): string {
  const lines = [
    `🧭 Explored "${report.sharpened}"`,
    `${report.candidates.length} projects · ${report.clusters.length} clusters · ${report.gaps.length} gaps`,
  ];

  if (report.directions.length > 0) {
    lines.push("", "Directions:");
    for (const direction of report.directions.slice(0, 3)) {
      lines.push(`- ${direction.idea}`);
    }
  }
  if (written.length > 0) lines.push("", `Report: ${written.join(", ")}`);
  return `${lines.join("\n")}\n`;
}

function progressHandler(log: Logger): (event: ProgressEvent) => void {
  return (event) => {
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
      case "verify": {
        const label = event.ok
          ? "ok"
          : event.status === 404 || event.status === 410
            ? "gone"
            : "unverified";
        log.info(`  verify ${label} ${event.url}`);
        break;
      }
      case "inspect":
        log.info(
          `  inspect ${event.ok ? "ok" : "skipped"} ${event.candidateId}${event.reason ? ` (${event.reason})` : ""}`,
        );
        break;
      case "done":
        break;
    }
  };
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      deep: { type: "boolean", default: false },
      explore: { type: "boolean", default: false },
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

  const usesSubcommand = positionals[0] === "explore";
  const mode = values.explore || usesSubcommand ? "explore" : "validate";
  const subject = (usesSubcommand ? positionals.slice(1) : positionals).join(" ").trim();
  if (!subject) {
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
  const onProgress = progressHandler(log);

  log.info(
    `[githubpill] mode=${mode} provider=${llm.provider} model=${llm.model} sources=${config.sources.join(",")}`,
  );

  const flags = { json: values.json, html: values.html };
  const write = !values["no-write"];

  if (mode === "explore") {
    const { report, errors, dropped, unverified } = await explore({
      topic: subject,
      llm,
      config,
      adapters,
      onProgress,
      ...(values.deep ? { deep: {} } : {}),
    });
    reportWarnings(log, errors, dropped, unverified);
    const base = `${report.generatedAt.slice(0, 10)}-explore-${slugify(report.sharpened)}`;
    const written = await writeReports(values.out, base, write, flags, {
      markdown: renderExplorationMarkdown(report),
      json: report,
      html: renderExplorationHtml(report),
    });
    process.stdout.write(explorationBlock(report, written));
    return;
  }

  const { report, errors, dropped, unverified } = await validate({
    idea: subject,
    llm,
    config,
    adapters,
    onProgress,
    ...(values.deep ? { deep: {} } : {}),
  });
  reportWarnings(log, errors, dropped, unverified);
  const base = `${report.generatedAt.slice(0, 10)}-${slugify(report.sharpened)}`;
  const written = await writeReports(values.out, base, write, flags, {
    markdown: renderMarkdown(report),
    json: report,
    html: renderHtml(report),
  });
  process.stdout.write(validationBlock(report, written));
}

function reportWarnings(
  log: Logger,
  errors: readonly { source: string; query: string; message: string }[],
  dropped: readonly unknown[],
  unverified: readonly unknown[],
): void {
  if (errors.length > 0) {
    log.warn(`[githubpill] ${errors.length} query/queries failed and were skipped:`);
    for (const error of errors.slice(0, 5)) {
      log.warn(`  ${error.source} "${error.query}": ${error.message}`);
    }
  }
  if (dropped.length > 0) {
    log.warn(`[githubpill] dropped ${dropped.length} candidate(s) that no longer exist (404).`);
  }
  if (unverified.length > 0) {
    log.warn(
      `[githubpill] ${unverified.length} candidate(s) could not be verified (rate limit?) — kept as unverified.`,
    );
  }
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

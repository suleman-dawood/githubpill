import type { MatchLabel, Report, ReportCandidate, VerdictBand } from "../types.js";
import { escapeHtml } from "./escape.js";

const BAND_COLOR: Record<VerdictBand, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};
const BAND_LABEL: Record<VerdictBand, string> = {
  green: "No close match",
  yellow: "Some overlap",
  red: "Strong overlap",
};
const LABEL_COLOR: Record<MatchLabel, string> = {
  LIKELY_MATCH: "#ef4444",
  WORTH_INSPECTING: "#eab308",
  UNRELATED: "#64748b",
};

function axisBars(candidate: ReportCandidate): string {
  const axes: Array<[string, number]> = [
    ["core", candidate.axisScores.coreFunction],
    ["audience", candidate.axisScores.targetAudience],
    ["scope", candidate.axisScores.scope],
    ["approach", candidate.axisScores.approach],
    ["activity", candidate.axisScores.activity],
  ];
  const bars = axes
    .map(
      ([name, value]) => `
        <div class="axis">
          <span class="axis-name">${name}</span>
          <span class="axis-track"><span class="axis-fill" style="width:${(value / 3) * 100}%"></span></span>
          <span class="axis-value">${value}</span>
        </div>`,
    )
    .join("");
  return `<div class="axes">${bars}</div>`;
}

function candidateCard(candidate: ReportCandidate): string {
  const verified = candidate.verifiedAt
    ? `<span class="badge badge-verified">✓ verified ${escapeHtml(candidate.verifiedAt)}</span>`
    : `<span class="badge badge-unverified">unverified</span>`;

  const facts = [
    candidate.stars !== undefined ? `${candidate.stars.toLocaleString()} ★` : "",
    candidate.language ?? "",
    candidate.lastActivity ? `active ${candidate.lastActivity.slice(0, 10)}` : "",
    candidate.archived ? "archived" : "",
  ]
    .filter(Boolean)
    .map((fact) => `<span class="fact">${escapeHtml(fact)}</span>`)
    .join("");

  const evidence =
    candidate.evidence && candidate.evidence.length > 0
      ? `<ul class="evidence">${candidate.evidence
          .map(
            (cite) =>
              `<li><code>${escapeHtml(cite.path)}:${cite.line}</code> — ${escapeHtml(cite.note)}</li>`,
          )
          .join("")}</ul>`
      : "";

  return `
    <article class="candidate">
      <header>
        <a class="name" href="${escapeHtml(candidate.url)}">${escapeHtml(candidate.name)}</a>
        <span class="label" style="background:${LABEL_COLOR[candidate.label]}">${candidate.label}</span>
      </header>
      <div class="meta">${verified}<span class="fact">${candidate.sources.join(" · ")}</span>${facts}</div>
      ${candidate.description ? `<p class="description">${escapeHtml(candidate.description)}</p>` : ""}
      <p class="rationale">${escapeHtml(candidate.rationale)}</p>
      ${evidence}
      ${axisBars(candidate)}
    </article>`;
}

export function renderHtml(report: Report): string {
  const candidates =
    report.candidates.length > 0
      ? report.candidates.map(candidateCard).join("")
      : `<p class="empty">No candidate projects were retrieved.</p>`;

  const missing =
    report.yourAngle.missingFeatures.length > 0
      ? `<ul>${report.yourAngle.missingFeatures.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>`
      : `<p class="empty">No distinguishing features identified.</p>`;

  const color = BAND_COLOR[report.band];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GithubPill — ${escapeHtml(report.sharpened)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0b1120; color: #e2e8f0; font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, sans-serif; }
  main { max-width: 880px; margin: 0 auto; padding: 48px 24px 80px; }
  .verdict { border-left: 4px solid ${color}; padding: 4px 0 4px 20px; margin-bottom: 8px; }
  .verdict h1 { margin: 0; font-size: 26px; }
  .verdict .band { color: ${color}; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; font-size: 12px; }
  .idea { color: #94a3b8; font-style: italic; margin: 12px 0 24px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin: 40px 0 16px; }
  .summary { font-size: 16px; }
  .candidate { background: #111c33; border: 1px solid #1e293b; border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; }
  .candidate header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .name { color: #f8fafc; font-weight: 600; text-decoration: none; font-size: 16px; }
  .name:hover { text-decoration: underline; }
  .label { font-size: 11px; font-weight: 700; color: #0b1120; border-radius: 999px; padding: 2px 10px; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; font-size: 12px; }
  .badge, .fact { border-radius: 6px; padding: 2px 8px; background: #1e293b; color: #cbd5e1; }
  .badge-verified { background: #052e16; color: #4ade80; }
  .badge-unverified { background: #3f1d1d; color: #fca5a5; }
  .description { margin: 8px 0; color: #cbd5e1; }
  .rationale { margin: 8px 0; color: #94a3b8; }
  .evidence { margin: 8px 0; padding-left: 18px; color: #cbd5e1; font-size: 13px; }
  .evidence code { color: #7dd3fc; }
  .axes { display: grid; gap: 6px; margin-top: 12px; }
  .axis { display: grid; grid-template-columns: 72px 1fr 20px; align-items: center; gap: 10px; font-size: 12px; color: #94a3b8; }
  .axis-track { height: 6px; background: #1e293b; border-radius: 999px; overflow: hidden; }
  .axis-fill { display: block; height: 100%; background: ${color}; }
  .axis-value { text-align: right; }
  .empty { color: #64748b; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; }
  code { background: #1e293b; padding: 1px 6px; border-radius: 4px; }
</style>
</head>
<body>
<main>
  <div class="verdict">
    <div class="band">${BAND_LABEL[report.band]}</div>
    <h1>${escapeHtml(report.headline)}</h1>
  </div>
  <p class="idea">${escapeHtml(report.sharpened)}</p>
  <p class="summary">${escapeHtml(report.summary)}</p>

  <h2>What exists today</h2>
  ${candidates}

  <h2>What's missing — your angle</h2>
  <p>${escapeHtml(report.yourAngle.summary)}</p>
  ${missing}

  <footer>
    Generated ${escapeHtml(report.generatedAt)} ·
    ${report.stats.candidatesReported} candidates ·
    ${report.stats.citationsAlive}/${report.stats.citationsChecked} citations verified ·
    ${report.stats.queriesRun} queries in ${(report.stats.durationMs / 1000).toFixed(1)}s
  </footer>
</main>
</body>
</html>
`;
}

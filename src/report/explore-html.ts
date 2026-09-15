import type { ExplorationCandidate, ExplorationReport } from "../types.js";
import { escapeHtml } from "./escape.js";

function candidateCard(candidate: ExplorationCandidate): string {
  const facts = [
    candidate.stars !== undefined ? `${candidate.stars.toLocaleString()} ★` : "",
    candidate.language ?? "",
  ]
    .filter(Boolean)
    .map((fact) => `<span class="fact">${escapeHtml(fact)}</span>`)
    .join("");

  return `<a class="card" href="${escapeHtml(candidate.url)}">
    <span class="card-name">${escapeHtml(candidate.name)}</span>
    <span class="card-desc">${escapeHtml(candidate.description)}</span>
    <span class="meta">${facts}</span>
  </a>`;
}

function linkList(candidates: readonly ExplorationCandidate[]): string {
  return candidates
    .map((candidate) => `<a href="${escapeHtml(candidate.url)}">${escapeHtml(candidate.name)}</a>`)
    .join(", ");
}

export function renderExplorationHtml(report: ExplorationReport): string {
  const byId = new Map(report.candidates.map((candidate) => [candidate.id, candidate]));
  const resolve = (ids: readonly string[]): ExplorationCandidate[] =>
    ids
      .map((id) => byId.get(id))
      .filter((candidate): candidate is ExplorationCandidate => Boolean(candidate));

  const clusters =
    report.clusters.length > 0
      ? report.clusters
          .map(
            (cluster) => `<section class="cluster">
        <h3>${escapeHtml(cluster.theme)}</h3>
        <p class="muted">${escapeHtml(cluster.summary)}</p>
        <div class="grid">${resolve(cluster.candidateIds).map(candidateCard).join("")}</div>
      </section>`,
          )
          .join("")
      : `<p class="empty">No clusters.</p>`;

  const gaps =
    report.gaps.length > 0
      ? `<ul>${report.gaps
          .map(
            (gap) =>
              `<li>${escapeHtml(gap.observation)}<div class="muted">${linkList(resolve(gap.candidateIds))}</div></li>`,
          )
          .join("")}</ul>`
      : `<p class="empty">No gaps identified.</p>`;

  const directions =
    report.directions.length > 0
      ? report.directions
          .map(
            (direction) => `<article class="direction">
        <h3>${escapeHtml(direction.idea)}</h3>
        <p>${escapeHtml(direction.why)}</p>
        <p class="muted">Grounded in: ${linkList(resolve(direction.groundedIn))}</p>
      </article>`,
          )
          .join("")
      : `<p class="empty">No directions proposed.</p>`;

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
  .band { color: #38bdf8; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; font-size: 12px; }
  h1 { margin: 4px 0 8px; font-size: 26px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin: 40px 0 16px; }
  h3 { margin: 0 0 4px; font-size: 17px; }
  .topic { color: #94a3b8; font-style: italic; margin-bottom: 20px; }
  .cluster, .direction { background: #111c33; border: 1px solid #1e293b; border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; }
  .grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); margin-top: 12px; }
  .card { display: block; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 12px 14px; text-decoration: none; color: inherit; }
  .card:hover { border-color: #334155; }
  .card-name { display: block; font-weight: 600; color: #f8fafc; }
  .card-desc { display: block; color: #94a3b8; font-size: 13px; margin: 4px 0; }
  .fact { display: inline-block; background: #1e293b; border-radius: 6px; padding: 1px 8px; margin-right: 6px; font-size: 12px; color: #cbd5e1; }
  .muted { color: #94a3b8; font-size: 13px; }
  a { color: #7dd3fc; }
  ul { padding-left: 18px; }
  li { margin-bottom: 10px; }
  .empty { color: #64748b; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; }
</style>
</head>
<body>
<main>
  <div class="band">Landscape</div>
  <h1>${escapeHtml(report.sharpened)}</h1>
  <p class="topic">${escapeHtml(report.topic)}</p>
  <p>${escapeHtml(report.summary)}</p>

  <h2>Clusters</h2>
  ${clusters}

  <h2>Gaps</h2>
  ${gaps}

  <h2>Directions</h2>
  ${directions}

  <footer>
    Generated ${escapeHtml(report.generatedAt)} ·
    ${report.stats.candidatesReported} projects ·
    ${report.stats.citationsAlive}/${report.stats.citationsChecked} citations verified ·
    ${report.stats.queriesRun} queries in ${(report.stats.durationMs / 1000).toFixed(1)}s
  </footer>
</main>
</body>
</html>
`;
}

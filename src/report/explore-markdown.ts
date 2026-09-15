import type { ExplorationCandidate, ExplorationReport } from "../types.js";

function candidateLine(candidate: ExplorationCandidate): string {
  const facts = [
    candidate.stars !== undefined ? `${candidate.stars.toLocaleString()} ★` : "",
    candidate.language ?? "",
  ]
    .filter(Boolean)
    .join(" · ");
  const head = `- [${candidate.name}](${candidate.url})${facts ? ` — ${facts}` : ""}`;
  if (!candidate.evidence || candidate.evidence.length === 0) return head;
  const cites = candidate.evidence.map((cite) => `  - \`${cite.path}:${cite.line}\` — ${cite.note}`);
  return [head, ...cites].join("\n");
}

function linkList(candidates: readonly ExplorationCandidate[]): string {
  return candidates.map((candidate) => `[${candidate.name}](${candidate.url})`).join(" · ");
}

export function renderExplorationMarkdown(report: ExplorationReport): string {
  const byId = new Map(report.candidates.map((candidate) => [candidate.id, candidate]));
  const resolve = (ids: readonly string[]): ExplorationCandidate[] =>
    ids.map((id) => byId.get(id)).filter((candidate): candidate is ExplorationCandidate => Boolean(candidate));

  const clusters =
    report.clusters.length > 0
      ? report.clusters
          .map((cluster) =>
            [
              `### ${cluster.theme}`,
              "",
              cluster.summary,
              "",
              ...resolve(cluster.candidateIds).map(candidateLine),
            ].join("\n"),
          )
          .join("\n\n")
      : "_No clusters._";

  const gaps =
    report.gaps.length > 0
      ? report.gaps
          .map((gap) => `- ${gap.observation}\n  ${linkList(resolve(gap.candidateIds))}`)
          .join("\n")
      : "_No gaps identified._";

  const directions =
    report.directions.length > 0
      ? report.directions
          .map((direction) =>
            [
              `### ${direction.idea}`,
              "",
              direction.why,
              "",
              `Grounded in: ${linkList(resolve(direction.groundedIn))}`,
            ].join("\n"),
          )
          .join("\n\n")
      : "_No directions proposed._";

  return [
    `# Landscape — ${report.sharpened}`,
    "",
    `> **Topic:** ${report.topic}`,
    "",
    report.summary,
    "",
    "## Clusters",
    "",
    clusters,
    "",
    "## Gaps",
    "",
    gaps,
    "",
    "## Directions",
    "",
    directions,
    "",
    "---",
    "",
    "<details>",
    "<summary>Run metadata</summary>",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Sources queried: ${[...new Set(report.sourceRuns.map((run) => run.source))].join(", ")}`,
    `- Queries run: ${report.stats.queriesRun}`,
    `- Projects retrieved: ${report.stats.candidatesReported}`,
    `- Citations verified: ${report.stats.citationsAlive}/${report.stats.citationsChecked}`,
    `- Duration: ${(report.stats.durationMs / 1000).toFixed(1)}s`,
    "",
    "</details>",
    "",
  ].join("\n");
}

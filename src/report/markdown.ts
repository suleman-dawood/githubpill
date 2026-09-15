import type { MatchLabel, Report, ReportCandidate, VerdictBand } from "../types.js";

const BADGE: Record<VerdictBand, string> = { green: "🟢", yellow: "🟡", red: "🔴" };

function scoreLine(candidate: ReportCandidate): string {
  const { axisScores: a } = candidate;
  return `core_function=${a.coreFunction} target_audience=${a.targetAudience} scope=${a.scope} approach=${a.approach} activity=${a.activity} (sum=${candidate.axisSum})`;
}

function candidateBlock(candidate: ReportCandidate): string {
  const facts = [
    candidate.stars !== undefined ? `**Stars:** ${candidate.stars.toLocaleString()}` : "",
    candidate.language ? `**Language:** ${candidate.language}` : "",
    candidate.lastActivity ? `**Last activity:** ${candidate.lastActivity}` : "",
    candidate.archived ? "**Archived**" : "",
  ].filter(Boolean);

  const verified = candidate.verifiedAt ? ` — verified ${candidate.verifiedAt}` : " — unverified";

  const lines = [
    `### ${candidate.name} — ${candidate.label}`,
    "",
    `[${candidate.name}](${candidate.url})${verified}`,
    `**Sources:** ${candidate.sources.join(", ")}`,
  ];
  if (candidate.description) lines.push("", `**What it does:** ${candidate.description}`);
  lines.push("", `**Overlap:** ${candidate.rationale}`);
  if (candidate.evidence && candidate.evidence.length > 0) {
    lines.push("", "**Evidence from the clone:**");
    for (const cite of candidate.evidence) {
      lines.push(`- \`${cite.path}:${cite.line}\` — ${cite.note}`);
    }
  }
  if (facts.length > 0) lines.push("", facts.join(" · "));
  lines.push("", `**Axis scores:** ${scoreLine(candidate)}`);

  return lines.join("\n");
}

export function renderMarkdown(report: Report): string {
  const candidateCount = report.candidates.length;
  const labels = new Set<MatchLabel>(report.candidates.map((candidate) => candidate.label));

  const lines: string[] = [
    `# ${BADGE[report.band]} ${report.headline}`,
    "",
    `> **Your idea:** ${report.sharpened}`,
    "",
    report.summary,
    "",
    "## What exists today",
    "",
    candidateCount === 0
      ? "_No candidate projects were retrieved._"
      : report.candidates.map(candidateBlock).join("\n\n"),
    "",
    "## What's missing — your angle",
    "",
    report.yourAngle.summary,
    "",
    report.yourAngle.missingFeatures.length
      ? report.yourAngle.missingFeatures.map((feature) => `- ${feature}`).join("\n")
      : "_No distinguishing features identified — your idea overlaps fully with existing candidates._",
    "",
    "---",
    "",
    "<details>",
    "<summary>Run metadata</summary>",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Preserved terms: ${report.preservedTerms.join(", ") || "(none)"}`,
    `- Sources queried: ${[...new Set(report.sourceRuns.map((run) => run.source))].join(", ")}`,
    `- Queries run: ${report.stats.queriesRun}`,
    `- Hits found: ${report.stats.hitsFound}`,
    `- Candidates reported: ${report.stats.candidatesReported}`,
    `- Citations verified: ${report.stats.citationsAlive}/${report.stats.citationsChecked}`,
    `- Duration: ${(report.stats.durationMs / 1000).toFixed(1)}s`,
    `- Labels: ${[...labels].join(", ") || "(none)"}`,
    "",
    "</details>",
    "",
  ];

  return lines.join("\n");
}

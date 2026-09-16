import type { AxisScores, MatchLabel, VerdictBand } from "../types.js";

export function axisSum(scores: AxisScores): number {
  return (
    scores.coreFunction + scores.targetAudience + scores.scope + scores.approach + scores.activity
  );
}

export function corePair(scores: AxisScores): number {
  return scores.coreFunction + scores.targetAudience;
}

/** Thresholds that separate the three labels (core pair, then total). */
const LIKELY_MATCH = { corePair: 5, sum: 11 } as const;
const WORTH_INSPECTING = { corePair: 4, sum: 8 } as const;

/**
 * Derive the match label mechanically from axis scores. The LLM never emits a
 * label — two runs with identical scores always produce identical verdicts.
 */
export function deriveLabel(scores: AxisScores): MatchLabel {
  const sum = axisSum(scores);
  const pair = corePair(scores);
  if (pair >= LIKELY_MATCH.corePair && sum >= LIKELY_MATCH.sum) return "LIKELY_MATCH";
  if (pair >= WORTH_INSPECTING.corePair && sum >= WORTH_INSPECTING.sum) return "WORTH_INSPECTING";
  return "UNRELATED";
}

export function deriveBand(labels: readonly MatchLabel[]): VerdictBand {
  if (labels.includes("LIKELY_MATCH")) return "red";
  if (labels.includes("WORTH_INSPECTING")) return "yellow";
  return "green";
}

/** A strong match needs file evidence; without any, cap the label. */
export function capWithoutEvidence(label: MatchLabel): MatchLabel {
  return label === "LIKELY_MATCH" ? "WORTH_INSPECTING" : label;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function headlineFor(band: VerdictBand, count: number): string {
  switch (band) {
    case "red":
      return `This already exists — ${count} ${pluralize(count, "strong match", "strong matches")} found`;
    case "yellow":
      return `Some overlap — worth a closer look at ${count} ${pluralize(count, "candidate", "candidates")}`;
    case "green":
      return "No close match found — your idea looks novel";
  }
}

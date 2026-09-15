import type { AxisScores, MatchLabel, VerdictBand } from "../types.js";

export function axisSum(scores: AxisScores): number {
  return (
    scores.coreFunction + scores.targetAudience + scores.scope + scores.approach + scores.activity
  );
}

export function corePair(scores: AxisScores): number {
  return scores.coreFunction + scores.targetAudience;
}

/**
 * Derive the match label mechanically from axis scores. The LLM never emits a
 * label — two runs with identical scores always produce identical verdicts.
 */
export function deriveLabel(scores: AxisScores): MatchLabel {
  const sum = axisSum(scores);
  const pair = corePair(scores);
  if (pair >= 5 && sum >= 11) return "LIKELY_MATCH";
  if (pair >= 4 && sum >= 8) return "WORTH_INSPECTING";
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

export function headlineFor(band: VerdictBand, count: number): string {
  const plural = count === 1 ? "" : "s";
  switch (band) {
    case "red":
      return `This already exists — ${count} strong match${count === 1 ? "" : "es"} found`;
    case "yellow":
      return `Some overlap — worth a closer look at ${count} candidate${plural}`;
    case "green":
      return "No close match found — your idea looks novel";
  }
}

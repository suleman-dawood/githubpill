import type { Candidate, QueryPlan, ReportCandidate } from "../types.js";
import type { LLMClient } from "./providers/types.js";
import { SynthesisSchema, type SynthesisOutput } from "./schema.js";
import { axisSum, deriveLabel } from "./verdict.js";

export interface SynthesisResult {
  summary: string;
  candidates: ReportCandidate[];
  yourAngle: { summary: string; missingFeatures: string[] };
}

const SYSTEM = [
  "You are a prior-art analyst for software project ideas.",
  "Given an idea and a set of retrieved candidate projects, judge how closely each candidate overlaps.",
  "Score five axes 0-3 (higher is a stronger match): coreFunction, targetAudience, scope, approach, activity.",
  "For any axis scored 2 or higher, cite a specific phrase from the candidate's name or description as evidence.",
  "The user wants their idea to be novel. Resist that. Your job is to find matches, not to validate originality.",
  "Only judge the candidates provided. Never invent candidates.",
  "Do not emit a verdict label; scores are derived mechanically downstream.",
].join(" ");

function describe(candidate: Candidate): string {
  const facts = [
    `sources=${candidate.sources.join(",")}`,
    `stars=${candidate.stars ?? 0}`,
    candidate.language ? `language=${candidate.language}` : "",
    candidate.lastActivity ? `lastActivity=${candidate.lastActivity}` : "",
    candidate.archived ? "archived=true" : "",
  ].filter(Boolean);
  return [
    `- id: ${candidate.id}`,
    `  name: ${candidate.name}`,
    `  description: ${candidate.description || "(none)"}`,
    `  ${facts.join(" · ")}`,
  ].join("\n");
}

export function buildPrompt(idea: string, plan: QueryPlan, candidates: readonly Candidate[]): string {
  return [
    `IDEA (sharpened): ${plan.sharpened}`,
    plan.preservedTerms.length ? `PRESERVED TERMS: ${plan.preservedTerms.join(", ")}` : "",
    "",
    `ORIGINAL IDEA: ${idea}`,
    "",
    "CANDIDATES:",
    ...candidates.map(describe),
    "",
    `Judge all ${candidates.length} candidates above. Return one entry per candidate, using the exact id.`,
    "Then write a two-to-three sentence summary of what already exists, and a 'your angle' summary plus the features the idea would need to be distinct.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function assemble(candidates: readonly Candidate[], output: SynthesisOutput): SynthesisResult {
  const byId = new Map(output.candidates.map((entry) => [entry.candidateId, entry]));

  const judged: ReportCandidate[] = candidates.map((candidate) => {
    const entry = byId.get(candidate.id);
    const axisScores = entry?.axisScores ?? {
      coreFunction: 0,
      targetAudience: 0,
      scope: 0,
      approach: 0,
      activity: 0,
    };
    const result: ReportCandidate = {
      id: candidate.id,
      name: candidate.name,
      url: candidate.url,
      description: candidate.description,
      sources: candidate.sources,
      label: deriveLabel(axisScores),
      axisScores,
      axisSum: axisSum(axisScores),
      rationale: entry?.rationale ?? "Not judged by the model.",
    };
    if (candidate.stars !== undefined) result.stars = candidate.stars;
    if (candidate.language) result.language = candidate.language;
    if (candidate.lastActivity) result.lastActivity = candidate.lastActivity;
    if (candidate.archived !== undefined) result.archived = candidate.archived;
    if (candidate.verification) result.verifiedAt = candidate.verification.checkedAt;
    return result;
  });

  return {
    summary: output.summary,
    candidates: judged,
    yourAngle: {
      summary: output.yourAngle.summary,
      missingFeatures: output.yourAngle.missingFeatures,
    },
  };
}

/** Run the synthesis step, or return a clean no-candidates result. */
export async function synthesize(
  idea: string,
  plan: QueryPlan,
  candidates: readonly Candidate[],
  llm: LLMClient,
): Promise<SynthesisResult> {
  if (candidates.length === 0) {
    return {
      summary: "No candidate projects were retrieved from any source.",
      candidates: [],
      yourAngle: {
        summary: "No prior art was found in the searched sources.",
        missingFeatures: [],
      },
    };
  }

  const output = await llm.completeStructured({
    system: SYSTEM,
    prompt: buildPrompt(idea, plan, candidates),
    schema: SynthesisSchema,
    schemaName: "prior_art_analysis",
  });

  return assemble(candidates, output);
}

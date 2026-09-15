import type {
  Candidate,
  ExplorationCandidate,
  ExplorationCluster,
  ExplorationDirection,
  ExplorationGap,
  QueryPlan,
} from "../types.js";
import type { LLMClient } from "./providers/types.js";
import { describeCandidate } from "./describe.js";
import { ExplorationSchema } from "./explore-schema.js";

export interface ExplorationSynthesis {
  summary: string;
  clusters: ExplorationCluster[];
  gaps: ExplorationGap[];
  directions: ExplorationDirection[];
  candidates: ExplorationCandidate[];
}

const SYSTEM = [
  "You are a landscape analyst for software project ideas.",
  "Given a topic and a set of retrieved projects, describe the shape of the space.",
  "Group the projects into clusters by approach or segment.",
  "Identify gaps: things none of the retrieved projects does.",
  "Propose a few directions worth building, each grounded in the retrieved projects.",
  "Only use the candidates provided. Never invent projects.",
  "Phrase every gap as 'none of the retrieved projects does X' — retrieval is not exhaustive.",
].join(" ");

export function buildExplorationPrompt(
  topic: string,
  plan: QueryPlan,
  candidates: readonly Candidate[],
): string {
  return [
    `TOPIC: ${plan.sharpened}`,
    `ORIGINAL REQUEST: ${topic}`,
    "",
    "RETRIEVED PROJECTS:",
    ...candidates.map(describeCandidate),
    "",
    `Cluster these ${candidates.length} projects, describe what none of them does, and propose directions. Use the exact ids above.`,
  ].join("\n");
}

function keepKnownIds(ids: readonly string[], known: ReadonlySet<string>): string[] {
  return [...new Set(ids)].filter((id) => known.has(id));
}

function toCandidate(candidate: Candidate): ExplorationCandidate {
  const result: ExplorationCandidate = {
    id: candidate.id,
    name: candidate.name,
    url: candidate.url,
    description: candidate.description,
    sources: candidate.sources,
  };
  if (candidate.stars !== undefined) result.stars = candidate.stars;
  if (candidate.language) result.language = candidate.language;
  if (candidate.lastActivity) result.lastActivity = candidate.lastActivity;
  if (candidate.verification) result.verifiedAt = candidate.verification.checkedAt;
  return result;
}

/** Cluster the retrieved projects and surface gaps and directions. */
export async function synthesizeExploration(
  topic: string,
  plan: QueryPlan,
  candidates: readonly Candidate[],
  llm: LLMClient,
): Promise<ExplorationSynthesis> {
  if (candidates.length === 0) {
    return {
      summary: "No projects were retrieved for this topic.",
      clusters: [],
      gaps: [],
      directions: [],
      candidates: [],
    };
  }

  const output = await llm.completeStructured({
    system: SYSTEM,
    prompt: buildExplorationPrompt(topic, plan, candidates),
    schema: ExplorationSchema,
    schemaName: "exploration",
  });

  const known = new Set(candidates.map((candidate) => candidate.id));

  return {
    summary: output.summary,
    clusters: output.clusters
      .map((cluster) => ({ ...cluster, candidateIds: keepKnownIds(cluster.candidateIds, known) }))
      .filter((cluster) => cluster.candidateIds.length > 0),
    gaps: output.gaps
      .map((gap) => ({ ...gap, candidateIds: keepKnownIds(gap.candidateIds, known) }))
      .filter((gap) => gap.candidateIds.length > 0),
    directions: output.directions
      .map((direction) => ({ ...direction, groundedIn: keepKnownIds(direction.groundedIn, known) }))
      .filter((direction) => direction.groundedIn.length > 0),
    candidates: candidates.map(toCandidate),
  };
}

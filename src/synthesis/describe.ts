import type { Candidate } from "../types.js";

/** One candidate as a compact block for an LLM prompt. */
export function describeCandidate(candidate: Candidate): string {
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

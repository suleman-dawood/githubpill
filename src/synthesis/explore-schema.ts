import { z } from "zod";

export const ExplorationSchema = z.object({
  summary: z
    .string()
    .describe("Two or three sentences describing the shape of this space"),
  clusters: z.array(
    z.object({
      theme: z.string().describe("A short name for this group of projects"),
      summary: z.string().describe("One sentence on what this group has in common"),
      candidateIds: z.array(z.string()).describe("Ids of the candidates in this group"),
    }),
  ),
  gaps: z.array(
    z.object({
      observation: z
        .string()
        .describe("Something none of the retrieved projects does, phrased as an observation"),
      candidateIds: z.array(z.string()).describe("Ids that support the observation"),
    }),
  ),
  directions: z.array(
    z.object({
      idea: z.string().describe("A project idea worth considering, one sentence"),
      why: z.string().describe("Why this is an opening, given the retrieved projects"),
      groundedIn: z.array(z.string()).describe("Ids this direction is grounded in"),
    }),
  ),
});

export type ExplorationOutput = z.infer<typeof ExplorationSchema>;

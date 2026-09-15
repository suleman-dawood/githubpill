import { z } from "zod";

export const AxisScoresSchema = z.object({
  coreFunction: z.number().int().min(0).max(3).describe("Same primary problem? 0 different, 3 same"),
  targetAudience: z.number().int().min(0).max(3).describe("Same users? 0 different, 3 same"),
  scope: z.number().int().min(0).max(3).describe("Same breadth of features? 0 different, 3 same"),
  approach: z.number().int().min(0).max(3).describe("Same implementation strategy/interface? 0 different, 3 same"),
  activity: z.number().int().min(0).max(3).describe("Alive? 0 archived/dormant, 3 actively maintained"),
});

export const CandidateJudgementSchema = z.object({
  candidateId: z.string().describe("The id of the candidate being judged, copied verbatim"),
  axisScores: AxisScoresSchema,
  rationale: z.string().describe("One or two sentences citing specific evidence from the candidate"),
});

export const SynthesisSchema = z.object({
  summary: z
    .string()
    .describe("Two or three sentences: what already exists in this space and how it overlaps with the idea"),
  candidates: z.array(CandidateJudgementSchema),
  yourAngle: z.object({
    summary: z.string().describe("One sentence positioning the user's angle, at most 25 words"),
    missingFeatures: z
      .array(z.string())
      .describe("Three to seven features the idea would need to be distinct, or empty if none"),
  }),
});

export type SynthesisOutput = z.infer<typeof SynthesisSchema>;
export type CandidateJudgementOutput = z.infer<typeof CandidateJudgementSchema>;

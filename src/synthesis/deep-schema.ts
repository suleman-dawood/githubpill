import { z } from "zod";
import { AxisScoresSchema } from "./schema.js";

export const DeepJudgeSchema = z.object({
  axisScores: AxisScoresSchema,
  rationale: z.string().describe("One or two sentences citing the file evidence"),
  evidence: z.array(
    z.object({
      path: z.string().describe("Path relative to the repository root, as shown in the file blocks"),
      line: z.number().int().positive().describe("1-indexed line number"),
      note: z.string().describe("What this line shows about the overlap"),
    }),
  ),
});

export type DeepJudgeOutput = z.infer<typeof DeepJudgeSchema>;

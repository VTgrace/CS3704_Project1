import { rankingInstructions, rankingInput } from "./rankingInput";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { config } from "./config";
import type { EvidenceCourse, RankedCourse } from "./contracts";
import type { RecommendationRequest } from "../src/types/index";
export const rankingSchema = z.object({
  recommendations: z.array(
    z.object({
      courseId: z.string(),
      sectionId: z.string(),
      reason: z.string(),
      citationIds: z.array(z.string()),
    }),
  ),
});
export async function rank(
  request: RecommendationRequest,
  candidates: EvidenceCourse[],
): Promise<RankedCourse[]> {
  const client = new OpenAI({
    apiKey: config.openaiKey,
    timeout: 20000,
    maxRetries: 0,
  });
  const response = await client.responses.parse({
    model: config.openaiModel,
    store: false,
    max_output_tokens: 1800,
    instructions: rankingInstructions,
    input: JSON.stringify(rankingInput(request, candidates)),
    text: { format: zodTextFormat(rankingSchema, "course_recommendations") },
  });
  if (!response.output_parsed)
    throw new Error("No structured recommendation returned");
  return response.output_parsed.recommendations;
}

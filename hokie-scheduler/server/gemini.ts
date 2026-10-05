import { LlmServiceError } from "./llmError";
import { z } from "zod";
import { rankingSchema } from "./llm";
import { rankingInput, rankingInstructions } from "./rankingInput";
import type { RecommendationRequest } from "../src/types/index";
import type { EvidenceCourse, RankedCourse } from "./contracts";
import { config } from "./config";
const envelope = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.string(),
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional(),
              thought: z.boolean().optional(),
            }),
          ),
        }),
      }),
    )
    .min(1),
});
export function createGeminiRanker(
  key: string,
  model: string,
  fetcher: typeof fetch = fetch,
) {
  return async (
    request: RecommendationRequest,
    candidates: EvidenceCourse[],
  ): Promise<RankedCourse[]> => {
    if (!key || !/^[a-zA-Z0-9._-]+$/.test(model))
      throw new Error("Gemini is not configured");
    const signal = AbortSignal.timeout(35000);
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await fetcher(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            redirect: "error",
            signal,
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: rankingInstructions }] },
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: JSON.stringify(rankingInput(request, candidates)) },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                responseJsonSchema: z.toJSONSchema(rankingSchema),
                maxOutputTokens: 4096,
              },
            }),
          },
        );
      } catch {
        throw new LlmServiceError(signal.aborted ? "timeout" : "connection");
      }
      if (![502, 503, 504].includes(response.status) || attempt === 1) break;
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    // Expose only classified errors, never provider bodies or credentials.
    if (!response?.ok) {
      throw new LlmServiceError(
        response?.status === 429
          ? "quota"
          : response?.status === 401 || response?.status === 403
            ? "auth"
            : response?.status === 404
              ? "model"
              : "unavailable",
      );
    }
    const parsed = envelope.parse(await response.json());
    const candidate = parsed.candidates[0];
    if (candidate.finishReason !== "STOP")
      throw new Error("Gemini returned an incomplete or blocked answer");
    const text = candidate.content.parts
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("");
    return rankingSchema.parse(JSON.parse(text)).recommendations;
  };
}
export const rankGemini = createGeminiRanker(
  config.geminiKey,
  config.geminiModel,
);

import { config } from "./config";
import { rank } from "./llm";
import { rankGemini } from "./gemini";
export function selectProvider(settings = config): "gemini" | "openai" | null {
  const gemini = !!settings.geminiKey && !!settings.geminiModel;
  const openai = !!settings.openaiKey && !!settings.openaiModel;
  if (settings.llmProvider === "gemini") return gemini ? "gemini" : null;
  if (settings.llmProvider === "openai") return openai ? "openai" : null;
  if (settings.llmProvider !== "auto") return null;
  return gemini ? "gemini" : openai ? "openai" : null;
}
export const activeProvider = selectProvider();
export const activeRanker =
  activeProvider === "gemini"
    ? rankGemini
    : activeProvider === "openai"
      ? rank
      : undefined;

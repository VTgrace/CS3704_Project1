import { activeProvider } from "./llmProvider";
import OpenAI from "openai";
import { config } from "./config";
import { timetable, catalog } from "./providers/vt";
import { reviews } from "./providers/reviews";
import { reddit } from "./providers/reddit";
const semester = process.argv[2] || "Fall 2026";
if (!/^(Fall|Spring|Summer|Winter) 20\d{2}$/.test(semester))
  throw new Error('Use a semester such as "Fall 2026"');
console.log("Checking integrations; credentials will not be printed.");
const results = await Promise.all([
  timetable({ subjects: ["CS"], semester }),
  catalog(["CS"]),
  reviews(),
  reddit(["CS 3724"]),
]);
for (const result of results)
  console.log(
    `${result.status.source}: ${result.status.state} (${result.items.length} records) — ${result.status.detail}`,
  );
if (activeProvider === "gemini") {
  try {
    if (!/^[a-zA-Z0-9._-]+$/.test(config.geminiModel))
      throw new Error("Invalid model");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}`,
      {
        headers: { "x-goog-api-key": config.geminiKey },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error("Model check failed");
    console.log("Gemini: model access confirmed. No generation requested.");
  } catch {
    console.log(
      "Gemini: model access check failed. Check key and model locally.",
    );
    process.exitCode = 1;
  }
} else if (activeProvider === "openai") {
  try {
    await new OpenAI({
      apiKey: config.openaiKey,
      timeout: 10000,
      maxRetries: 0,
    }).models.retrieve(config.openaiModel);
    console.log("LLM: model access confirmed. No generation was requested.");
  } catch {
    console.log(
      "LLM: configured but model access check failed. Check your key and model locally.",
    );
    process.exitCode = 1;
  }
} else {
  console.log(
    "LLM: not configured. Set GEMINI_API_KEY and GEMINI_MODEL (or OpenAI settings) and check LLM_PROVIDER in .env.",
  );
  process.exitCode = 1;
}
if (results.some((r) => r.status.state !== "ready")) process.exitCode = 1;

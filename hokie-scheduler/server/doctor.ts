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
if (config.openaiKey && config.openaiModel) {
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
    "LLM: not configured. Set OPENAI_API_KEY and OPENAI_MODEL in .env.",
  );
  process.exitCode = 1;
}
if (results.some((r) => r.status.state !== "ready")) process.exitCode = 1;

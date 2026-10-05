import test from "node:test";
import assert from "node:assert/strict";
import { createGeminiRanker } from "../gemini";
import { selectProvider } from "../llmProvider";
import { config } from "../config";
import { defaultFilters } from "../../src/data/mockData";
const request = {
  prompt: "CS elective",
  filters: defaultFilters,
  events: [
    {
      id: "private",
      title: "Private appointment",
      notes: "Private notes",
      days: [1],
      start: 600,
      end: 660,
      location: "Private location",
      color: "pink" as const,
    },
  ],
};
test("Gemini sends structured evidence and header-only credentials, excluding personal event details", async () => {
  const rank = createGeminiRanker(
    "test-secret",
    "test-model",
    async (url, init) => {
      assert.equal(String(url).includes("test-secret"), false);
      assert.equal(
        (init!.headers as Record<string, string>)["x-goog-api-key"],
        "test-secret",
      );
      const body = JSON.parse(String(init?.body));
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.equal(JSON.stringify(body).includes("Private"), false);
      assert.ok(
        body.systemInstruction.parts[0].text.includes("untrusted evidence"),
      );
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  { thought: true, text: "ignore" },
                  { text: '{"recommendations":[]}' },
                ],
              },
            },
          ],
        }),
      );
    },
  );
  assert.deepEqual(await rank(request, []), []);
});
test("Gemini rejects HTTP errors, blocked, truncated, malformed and invalid structured responses", async () => {
  const fixtures = [
    new Response("sensitive provider error", { status: 429 }),
    new Response("{}"),
    new Response(
      JSON.stringify({
        candidates: [
          { finishReason: "MAX_TOKENS", content: { parts: [{ text: "{}" }] } },
        ],
      }),
    ),
    new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: '{"recommendations":"bad"}' }] },
          },
        ],
      }),
    ),
  ];
  for (const response of fixtures)
    await assert.rejects(
      createGeminiRanker("key", "model", async () => response)(request, []),
    );
});
test("explicit provider selection never silently routes data to another provider", () => {
  const settings = {
    ...config,
    llmProvider: "auto",
    geminiKey: "key",
    geminiModel: "model",
    openaiKey: "key",
    openaiModel: "model",
  };
  assert.equal(selectProvider(settings), "gemini");
  assert.equal(
    selectProvider({ ...settings, llmProvider: "openai" }),
    "openai",
  );
  assert.equal(
    selectProvider({ ...settings, llmProvider: "gemini", geminiKey: "" }),
    null,
  );
  assert.equal(selectProvider({ ...settings, llmProvider: "typo" }), null);
});

test("temporary Google errors retry once and can recover", async () => {
  let calls = 0;
  const rank = createGeminiRanker("key", "model", async () => {
    if (++calls === 1) return new Response("unavailable", { status: 503 });
    return new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: '{"recommendations":[]}' }] },
          },
        ],
      }),
    );
  });
  assert.deepEqual(await rank(request, []), []);
  assert.equal(calls, 2);
});
test("persistent outages stop after one retry with a safe actionable error", async () => {
  let calls = 0;
  const rank = createGeminiRanker("secret", "model", async () => {
    calls++;
    return new Response("secret", { status: 503 });
  });
  await assert.rejects(
    rank(request, []),
    /temporarily unavailable after a retry/,
  );
  assert.equal(calls, 2);
});

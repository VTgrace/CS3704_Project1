import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../app";
import { requestSchema, type Dependencies } from "../contracts";
import { eligible, recommend, validateRanking } from "../recommend";
import { parseTimetable, parseTime, parseCatalog } from "../providers/vt";
import { defaultFilters, personalEvents } from "../../src/data/mockData";
const fixture = `<table summary="This table displays the Timetable of Classes"><tr><td>CRN</td><td>Course</td></tr><tr><td>12345</td><td>CS-3724</td><td>Human Computer Interaction</td><td>L</td><td>Face-to-Face Instruction</td><td>3</td><td>40</td><td>N/A</td><td>T R</td><td>10:00AM</td><td>11:15AM</td><td>MCB 100</td><td>10T</td></tr><tr><td>Comments for CRN 12345:</td><td>Prerequisite: CS 2114.</td></tr></table>`;
const c = parseTimetable(fixture, "Fall 2026")[0];
const request = {
  prompt: "Show me CS electives",
  filters: defaultFilters,
  events: personalEvents,
};
const deps: Dependencies = {
  timetable: async () => ({
    items: [c],
    status: { source: "vt-timetable", state: "ready", detail: "test" },
  }),
  catalog: async () => ({
    items: [],
    status: { source: "vt-catalog", state: "unavailable", detail: "test" },
  }),
  reviews: async () => ({
    items: [],
    status: {
      source: "ratemyprofessors",
      state: "not-configured",
      detail: "test",
    },
  }),
  reddit: async () => ({
    items: [],
    status: { source: "reddit", state: "not-configured", detail: "test" },
  }),
};
test("parse timetable with genuine source URL, unknown ratings and section restrictions", () => {
  assert.equal(c.id, "CS 3724");
  assert.deepEqual(c.meeting.days, [2, 4]);
  assert.equal(c.meeting.start, 600);
  assert.equal(c.scheduleVerified, true);
  assert.equal(c.rating, null);
  assert.match(c.citations[0].url, /CRN=12345/);
  assert.match(c.restrictions ?? "", /CS 2114/);
  assert.equal(parseTime("12:00AM"), 0);
  assert.equal(parseTime("12:00PM"), 720);
  assert.equal(parseTime("TBA"), null);
});
test("malformed page fails closed and unknown/multiple meetings are not schedulable", () => {
  assert.throws(() => parseTimetable("<html>unavailable</html>", "Fall 2026"));
  const unknown = parseTimetable(
    fixture.replace("10:00AM", "TBA"),
    "Fall 2026",
  )[0];
  assert.equal(unknown.scheduleVerified, false);
  const multiple = parseTimetable(
    fixture.replace(
      "</table>",
      "<tr><td></td><td>M</td><td>2:00PM</td><td>3:00PM</td></tr></table>",
    ),
    "Fall 2026",
  )[0];
  assert.equal(multiple.scheduleVerified, false);
});
test("catalog metadata never supplies section meeting times", () => {
  const courses = parseCatalog(
    '<div class="courseblock"><p class="courseblocktitle">CS 3724 - Human Computer Interaction (3 credits)</p><div class="courseblockdesc">Interface design and evaluation.</div></div>',
    "CS",
  );
  assert.equal(courses[0].scheduleVerified, false);
  assert.equal(courses[0].citations[0].source, "vt-catalog");
});
test("validate input bounds and impossible dates", () => {
  assert.equal(requestSchema.safeParse(request).success, true);
  assert.equal(
    requestSchema.safeParse({ ...request, prompt: " " }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...request,
      events: [{ ...personalEvents[0], end: 2 }],
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...request,
      events: [{ ...personalEvents[0], date: "2026-02-30" }],
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...request,
      events: [{ ...personalEvents[0], date: "2026-99-99" }],
    }).success,
    false,
  );
});
test("conflicts, duplicate enrollment, explicit filters, and prompt day exclusions", () => {
  assert.equal(eligible(c, request), true);
  assert.equal(
    eligible(c, {
      ...request,
      events: [{ ...personalEvents[0], start: 620, end: 680 }],
    }),
    false,
  );
  assert.equal(
    eligible(c, { ...request, filters: { ...defaultFilters, rating: "4.0+" } }),
    false,
  );
  assert.equal(
    eligible(c, { ...request, prompt: "No classes on Tuesday" }),
    false,
  );
  assert.equal(eligible(c, { ...request, events: [c.meeting] }), false);
  assert.equal(eligible({ ...c, scheduleVerified: false }, request), false);
});
test("fallback is honest about absent LLM/review evidence and contains only retrieved citations", async () => {
  const result = await recommend(
    { ...request, prompt: "easy CS elective" },
    deps,
  );
  assert.equal(result.mode, "retrieval");
  assert.equal(result.courses[0].rating, null);
  assert.ok(result.warnings?.some((w) => w.includes("not enough")));
  assert.equal(result.courses[0].citations?.[0].url, c.citations[0].url);
  assert.equal(
    result.sources?.find((s) => s.source === "reddit")?.state,
    "not-configured",
  );
});
test("LLM cannot invent courses or citation IDs and failure falls back safely", async () => {
  const invalid = {
    courseId: c.id,
    sectionId: c.sectionId!,
    reason: "Great course",
    citationIds: ["invented"],
  };
  assert.throws(() => validateRanking([invalid], [c]));
  assert.throws(() =>
    validateRanking([{ ...invalid, courseId: "CS 9999" }], [c]),
  );
  const result = await recommend(request, {
    ...deps,
    rank: async () => [invalid],
  });
  assert.equal(result.mode, "retrieval");
  assert.ok(result.warnings?.some((w) => w.includes("unverifiable")));
});
test("valid structured ranking resolves citation references on the server", async () => {
  const result = await recommend(request, {
    ...deps,
    rank: async () => [
      {
        courseId: c.id,
        sectionId: c.sectionId!,
        reason: "A three-credit section.",
        citationIds: [c.citations[0].id],
      },
    ],
  });
  assert.equal(result.mode, "llm");
  assert.equal(result.courses[0].citations?.[0].url, c.citations[0].url);
});
test("no timetable data never produces fabricated recommendations", async () => {
  const result = await recommend(request, {
    ...deps,
    timetable: async () => ({
      items: [],
      status: {
        source: "vt-timetable",
        state: "unavailable",
        detail: "offline",
      },
    }),
  });
  assert.deepEqual(result.courses, []);
});
test("API health, validation, bad JSON, successful recommendation and rate limits", async () => {
  const server = createApp(deps).listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}`;
    assert.equal((await fetch(url + "/api/health")).status, 200);
    const post = (body: string) =>
      fetch(url + "/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    assert.equal((await post("{")).status, 400);
    assert.equal((await post("{}")).status, 400);
    const response = await post(JSON.stringify(request));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).courses[0].id, "CS 3724");
    for (let i = 0; i < 9; i++) await post(JSON.stringify(request));
    assert.equal((await post(JSON.stringify(request))).status, 429);
    assert.equal(
      (
        await fetch(url + "/api/health", {
          headers: { Origin: "https://untrusted.example" },
        })
      ).status,
      403,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { createRedditTokenProvider } from "../providers/redditAuth";
import { reviewEntry } from "../providers/reviews";
import { catalogEntry } from "../providers/catalogImport";
const credentials = {
  accessToken: "",
  clientId: "test-app",
  clientSecret: "test-secret",
  refreshToken: "test-refresh",
  userAgent: "test-agent",
};
test("Reddit refresh tokens are exchanged once and requests share the cached token", async () => {
  let calls = 0;
  const get = createRedditTokenProvider(credentials, async (url, init) => {
    calls++;
    assert.equal(url, "https://www.reddit.com/api/v1/access_token");
    assert.equal(
      (init!.body as URLSearchParams).get("grant_type"),
      "refresh_token",
    );
    return JSON.stringify({ access_token: "test-token", expires_in: 3600 });
  });
  assert.deepEqual(await Promise.all([get(), get()]), [
    "test-token",
    "test-token",
  ]);
  await get();
  assert.equal(calls, 1);
  await get(true);
  assert.equal(calls, 2);
});
test("Reddit app-only OAuth and invalid token responses are handled", async () => {
  const get = createRedditTokenProvider(
    { ...credentials, refreshToken: "" },
    async (_url, init) => {
      assert.equal(
        (init!.body as URLSearchParams).get("grant_type"),
        "client_credentials",
      );
      return JSON.stringify({ error: "access_denied" });
    },
  );
  await assert.rejects(get(), /valid token/);
});
test("provided bearer tokens do not trigger token exchange", async () => {
  const get = createRedditTokenProvider(
    { ...credentials, accessToken: "provided-token" },
    async () => {
      throw new Error("must not fetch");
    },
  );
  assert.equal(await get(), "provided-token");
});
test("review and catalog import schemas reject unrelated sources and invalid ratings", () => {
  const review = {
    courseId: "CS 3724",
    professor: "Test Instructor",
    rating: 4,
    difficulty: "Unknown",
    workload: "Unknown",
    url: "https://www.ratemyprofessors.com/professor/123",
    excerpt: "Fixture only.",
    retrievedAt: new Date().toISOString(),
  };
  assert.equal(reviewEntry.safeParse(review).success, true);
  assert.equal(reviewEntry.safeParse({ ...review, rating: 8 }).success, false);
  assert.equal(
    reviewEntry.safeParse({
      ...review,
      url: "https://example.com/professor/123",
    }).success,
    false,
  );
  const catalog = {
    courseId: "CS 3724",
    name: "Fixture",
    credits: 3,
    description: "Fixture only",
    url: "https://catalog.vt.edu/undergraduate/course-descriptions/cs/",
    retrievedAt: new Date().toISOString(),
  };
  assert.equal(catalogEntry.safeParse(catalog).success, true);
  assert.equal(
    catalogEntry.safeParse({ ...catalog, url: "https://example.com" }).success,
    false,
  );
});

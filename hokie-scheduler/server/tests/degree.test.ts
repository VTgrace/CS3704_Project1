import test from "node:test";
import assert from "node:assert/strict";
import { audit } from "../degree/audit";
import { cs2023 } from "../degree/plans";
import { auditRequestSchema, planSchema } from "../degree/schema";
test("degree checking honors minimum grades, alternatives, and uncertain transfer grades", () => {
  const result = audit(cs2023, [
    { courseId: "CS 1114", grade: "C-" },
    { courseId: "ECE 2574", grade: "B" },
    { courseId: "COMM 2004", grade: "P" },
    { courseId: "CS 3114", grade: "IP" },
  ]);
  const status = (id: string) => result.rules.find((r) => r.id === id)?.status;
  assert.equal(status("CS-1114"), "missing");
  assert.equal(status("CS-2114"), "met");
  assert.equal(status("communication"), "needs-review");
  assert.equal(status("CS-3114"), "in-progress");
  assert.equal(result.coverage, "partial");
});
test("repeated attempts do not add duplicate credit and shared requirements require review", () => {
  const plan = {
    ...cs2023,
    rules: [cs2023.rules[0], { ...cs2023.rules[0], id: "second" }],
  };
  const result = audit(plan, [
    { courseId: "CS 1114", grade: "A" },
    { courseId: "CS 1114", grade: "A" },
  ]);
  assert.equal(result.metCount, 0);
  assert.equal(result.rules[0].status, "needs-review");
});
test("imports reject wrong sources, invalid year ranges, and duplicate rule identifiers", () => {
  assert.equal(
    planSchema.safeParse({ ...cs2023, catalogYear: "2023–2026" }).success,
    false,
  );
  assert.equal(
    planSchema.safeParse({
      ...cs2023,
      rules: [cs2023.rules[0], cs2023.rules[0]],
    }).success,
    false,
  );
  assert.equal(
    planSchema.safeParse({
      ...cs2023,
      rules: [
        {
          ...cs2023.rules[0],
          source: {
            ...cs2023.rules[0].source,
            url: "https://vt.edu.evil.example/a.pdf",
          },
        },
      ],
    }).success,
    false,
  );
  assert.equal(
    auditRequestSchema.safeParse({
      planId: cs2023.id,
      catalogYear: cs2023.catalogYear,
      attempts: [{ courseId: "CS 1114", grade: "unknown" }],
    }).success,
    false,
  );
});

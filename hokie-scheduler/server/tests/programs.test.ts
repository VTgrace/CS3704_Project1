import test from "node:test";
import assert from "node:assert/strict";
import { parsePrograms } from "../providers/programs";
import { parseDepartment } from "../providers/department";
test("directory retains major options and source years, excluding minors and unsafe links", () => {
  const parsed = parsePrograms(
    `<table><tr><td>Majors</td><td>Option</td></tr><tr><td>Computer Science (CS)</td><td>No Option</td><td><a href="/content/cs.pdf">2023/2024</a><a href="https://evil.example/other.pdf">2026/2027</a></td></tr></table><table><tr><td>Minors</td></tr><tr><td>CS Minor</td></tr></table>`,
  );
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0].documents, [
    { year: "2023/2024", url: "https://www.registrar.vt.edu/content/cs.pdf" },
  ]);
  assert.throws(() => parsePrograms("<p>Robot challenge</p>"));
});
test("department enrichment preserves source evidence, not requirement or difficulty claims", () => {
  const courses = parseDepartment(
    "<ul><li>CS 3724: Introduction to Human Computer Interaction (example)</li><li>Unrelated navigation</li></ul>",
  );
  assert.equal(courses[0].name, "Introduction to Human Computer Interaction");
  assert.equal(courses[0].citation.source, "vt-department");
  assert.match(courses[0].citation.excerpt, /example/);
  assert.throws(() => parseDepartment("<p>No data</p>"));
});

import { readFile, stat } from "node:fs/promises";
import { z } from "zod";
import { planSchema, type DegreePlan } from "./schema";
import { config } from "../config";
const url =
  "https://students.cs.vt.edu/content/dam/website_cs_vt_edu/checksheets/CS-Major-2023-24.pdf";
const required = (id: string, alternatives: string[], minimumGrade = 0.7) => ({
  id: id.replaceAll(" ", "-"),
  label: id,
  alternatives: alternatives.map((courseId) => [{ courseId, minimumGrade }]),
  source: {
    url,
    page: alternatives.length > 1 ? 3 : 1,
    note: "Required course and listed substitutions; minimum C applies to the six specified CS courses (page 2).",
  },
});
const choice = (id: string, label: string, ids: string[], page: number) => ({
  id,
  label,
  alternatives: ids.map((courseId) => [{ courseId, minimumGrade: 0.7 }]),
  source: {
    url,
    page,
    note: "One of the listed courses is required in this category. Enrollment prerequisites and other degree rules are separate.",
  },
});
export const cs2023 = planSchema.parse({
  id: "cs-2023-2024",
  program: "Computer Science (CS) — No Option (CS)",
  catalogYear: "2023–2024",
  reviewedAt: "2026-10-01T00:00:00.000Z",
  coverage: "partial",
  rules: [
    required(
      "CS 1114",
      ["CS 1114", "CS 1054", "CS 2064", "ECE 1574", "ECE 2514"],
      2,
    ),
    required("CS 2114", ["CS 2114", "ECE 2574", "ECE 3514"], 2),
    required("CS 2505", ["CS 2505", "ECE 2564"], 2),
    ...["CS 2104", "CS 2506", "CS 3114"].map((c) => required(c, [c], 2)),
    ...[
      "CS 1944",
      "CS 3214",
      "CS 3604",
      "CS 3304",
      "CS 4944",
      "CHEM 1035",
      "CHEM 1045",
      "PHYS 2305",
      "ENGL 1105",
      "ENGL 1106",
      "MATH 1226",
    ].map((c) => required(c, [c])),
    required("MATH 1225", ["MATH 1225"], 1.7),
    required("MATH 2534", ["MATH 2534", "MATH 3034"]),
    required("MATH 3134", ["MATH 3134", "MATH 3124"]),
    choice(
      "communication",
      "Communications elective",
      ["COMM 2004", "COMM 2014"],
      4,
    ),
    choice(
      "writing",
      "Professional writing elective",
      [
        "ENGL 3764",
        "ENGL 3804",
        "ENGL 3814",
        "ENGL 3824",
        "ENGL 3834",
        "ENGL 3844",
        "ENGL 4824",
      ],
      4,
    ),
    choice(
      "statistics",
      "Statistics elective",
      [
        "STAT 4705",
        "STAT 4105",
        "STAT 4714",
        "STAT 4604",
        "STAT 3704",
        "CMDA 2006",
      ],
      4,
    ),
    choice(
      "theory",
      "CS theory elective",
      ["CS 4104", "CS 4114", "CS 4124", "CS 5104", "CS 5114"],
      5,
    ),
    choice(
      "capstone",
      "Listed CS capstone",
      [
        "CS 4274",
        "CS 4284",
        "CS 4624",
        "CS 4634",
        "CS 4644",
        "CS 4664",
        "CS 4704",
        "CS 4784",
        "CS 4884",
      ],
      5,
    ),
  ],
  manualChecks: [
    "123 total credits, 2.0 overall and CS GPA, residency and repeated-course policies.",
    "Pathways, non-technical credits, free electives and foreign language requirements.",
    "General CS electives and technical electives, including exclusions and independent-study/research limits.",
    "Natural science sequences, engineering foundations and linear/multivariable math combinations and substitutions.",
    "Prerequisites, transfer/AP equivalencies, pass/fail eligibility and any advisor-approved exceptions.",
    "STAT 3704 requires an additional free elective credit. Graduate-level course enrollment may need approval.",
  ],
});
export async function degreePlans(): Promise<DegreePlan[]> {
  const builtins = [cs2023];
  if (!config.degreePlansFile) return builtins;
  if ((await stat(config.degreePlansFile)).size > 5_000_000)
    throw new Error("Degree plan import too large");
  const imported = z
    .array(planSchema)
    .max(2000)
    .parse(JSON.parse(await readFile(config.degreePlansFile, "utf8")));
  const plans = [...builtins, ...imported];
  if (new Set(plans.map((p) => p.id)).size !== plans.length)
    throw new Error("Duplicate degree plan ID");
  if (
    new Set(plans.map((p) => `${p.program}|${p.catalogYear}`)).size !==
    plans.length
  )
    throw new Error("Duplicate program/year");
  return plans;
}

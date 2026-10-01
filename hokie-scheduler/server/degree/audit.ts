import type { Attempt, DegreePlan } from "./schema";
const points: Record<string, number> = {
  A: 4,
  "A-": 3.7,
  "B+": 3.3,
  B: 3,
  "B-": 2.7,
  "C+": 2.3,
  C: 2,
  "C-": 1.7,
  "D+": 1.3,
  D: 1,
  "D-": 0.7,
  F: 0,
};
export function audit(plan: DegreePlan, attempts: Attempt[]) {
  const rows = plan.rules.map((rule) => {
    const alternatives = rule.alternatives.map((option) => {
      const courses = option.map((c) => {
        const entries = attempts.filter((a) => a.courseId === c.courseId);
        const passed = entries.some(
          (a) => (points[a.grade] ?? -1) >= c.minimumGrade,
        );
        const uncertain = entries.some(
          (a) => a.grade === "P" || a.grade === "T",
        );
        return {
          ...c,
          status: passed
            ? "met"
            : uncertain
              ? "needs-review"
              : entries.some((a) => a.grade === "IP")
                ? "in-progress"
                : "missing",
        };
      });
      const status = courses.every((c) => c.status === "met")
        ? "met"
        : courses.every(
              (c) => c.status !== "missing" && c.status !== "needs-review",
            )
          ? "in-progress"
          : courses.some((c) => c.status === "needs-review")
            ? "needs-review"
            : "missing";
      return { courses, status };
    });
    const priority = ["met", "in-progress", "needs-review", "missing"];
    const best = [...alternatives].sort(
      (a, b) => priority.indexOf(a.status) - priority.indexOf(b.status),
    )[0];
    return {
      id: rule.id,
      label: rule.label,
      status: best.status,
      appliedCourses: best.courses
        .filter((c) => c.status === "met")
        .map((c) => c.courseId),
      alternatives,
      source: rule.source,
    };
  });
  // A course shared by separate requirements needs allocation review. Never silently double count.
  const owners = new Map<string, string[]>();
  for (const row of rows.filter((r) => r.status === "met"))
    for (const course of row.appliedCourses)
      owners.set(course, [...(owners.get(course) ?? []), row.id]);
  const ambiguous = new Set(
    [...owners.values()].filter((ids) => ids.length > 1).flat(),
  );
  for (const row of rows)
    if (ambiguous.has(row.id)) row.status = "needs-review";
  return {
    planId: plan.id,
    program: plan.program,
    catalogYear: plan.catalogYear,
    coverage: plan.coverage,
    rules: rows,
    metCount: rows.filter((r) => r.status === "met").length,
    totalChecked: rows.length,
    manualChecks: [
      ...plan.manualChecks,
      ...(ambiguous.size
        ? [
            "Some courses match multiple requirements; allocation must be reviewed before counting them twice.",
          ]
        : []),
    ],
    notice:
      "Based on self-reported grades and the cited rules only. Unlisted requirements, substitutions, credit totals and academic policies still require DARS/advisor review. This is not graduation clearance.",
  };
}
export type AuditResult = ReturnType<typeof audit>;

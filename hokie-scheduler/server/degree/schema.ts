import { z } from "zod";
export const courseCode = z.string().regex(/^[A-Z]{2,5} \d{4}H?$/);
export const grade = z.enum([
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
  "P",
  "T",
  "IP",
  "W",
]);
export const attempt = z.object({ courseId: courseCode, grade });
const source = z.object({
  url: z
    .string()
    .url()
    .refine((s) => {
      const u = new URL(s);
      return (
        u.protocol === "https:" &&
        (u.hostname === "vt.edu" || u.hostname.endsWith(".vt.edu"))
      );
    }),
  page: z.number().int().min(1).max(3000),
  note: z.string().min(1).max(500),
});
export const planSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,100}$/),
    program: z.string().min(1).max(300),
    catalogYear: z
      .string()
      .regex(/^20\d{2}–20\d{2}$/)
      .refine((s) => Number(s.slice(5)) === Number(s.slice(0, 4)) + 1),
    reviewedAt: z.string().datetime(),
    // Coverage is always partial: this checker does not certify graduation.
    coverage: z.literal("partial"),
    rules: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          label: z.string().min(1).max(200),
          // Any alternative may satisfy a rule; all courses in an alternative are needed.
          alternatives: z
            .array(
              z
                .array(
                  z.object({
                    courseId: courseCode,
                    minimumGrade: z.number().min(0.1).max(4),
                  }),
                )
                .min(1)
                .max(30),
            )
            .min(1)
            .max(100),
          source,
        }),
      )
      .min(1)
      .max(300),
    manualChecks: z.array(z.string().min(1).max(500)).min(1).max(100),
  })
  .superRefine((plan, ctx) => {
    if (new Set(plan.rules.map((r) => r.id)).size !== plan.rules.length)
      ctx.addIssue({ code: "custom", message: "Duplicate rule IDs" });
    for (const rule of plan.rules)
      for (const option of rule.alternatives)
        if (new Set(option.map((c) => c.courseId)).size !== option.length)
          ctx.addIssue({
            code: "custom",
            message: "Repeated course within an alternative",
          });
  });
export type DegreePlan = z.infer<typeof planSchema>;
export type Attempt = z.infer<typeof attempt>;
export const auditRequestSchema = z.object({
  planId: z.string().max(100),
  catalogYear: z.string().max(20),
  attempts: z.array(attempt).max(300),
});

import { readFile, stat } from "node:fs/promises";
import { z } from "zod";
import { config } from "../config";
import type { EvidenceCourse } from "../contracts";
export const catalogEntry = z.object({
  courseId: z.string().regex(/^[A-Z]{2,5} \d{4}$/),
  name: z.string().min(1).max(180),
  credits: z.number().int().min(1).max(12),
  description: z.string().min(1).max(3000),
  url: z
    .string()
    .url()
    .refine((value) => {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        u.hostname === "catalog.vt.edu" &&
        u.pathname.startsWith("/undergraduate/")
      );
    }),
  retrievedAt: z.string().datetime(),
});
export async function importedCatalog(
  subjects: string[],
): Promise<EvidenceCourse[]> {
  if (!config.catalogFile) return [];
  if ((await stat(config.catalogFile)).size > 2_000_000)
    throw new Error("Catalog import too large");
  const entries = z
    .array(catalogEntry)
    .max(3000)
    .parse(JSON.parse(await readFile(config.catalogFile, "utf8")));
  return entries
    .filter(
      (c) =>
        subjects.includes(c.courseId.split(" ")[0]) &&
        Date.parse(c.retrievedAt) <= Date.now() &&
        Date.now() - Date.parse(c.retrievedAt) < 366 * 86400000,
    )
    .map((c) => ({
      id: c.courseId,
      name: c.name,
      credits: c.credits,
      description: c.description,
      major: c.courseId.startsWith("CS ")
        ? "Computer Science"
        : "General Education",
      difficulty: "Unknown",
      rating: null,
      professor: "Not listed",
      workload: "Unknown",
      modality: "Unknown",
      tags: ["Catalog snapshot"],
      color: "pink",
      scheduleVerified: false,
      reason: "",
      meeting: {
        id: c.courseId,
        title: c.courseId,
        courseId: c.courseId,
        days: [],
        start: 0,
        end: 0,
        location: "Unknown",
        color: "pink",
      },
      citations: [
        {
          id: `catalog-import-${c.courseId.replace(" ", "-")}`,
          source: "vt-catalog",
          title: `VT catalog snapshot · ${c.courseId}`,
          url: c.url,
          retrievedAt: c.retrievedAt,
          excerpt: `${c.courseId}: ${c.name}. ${c.credits} credits. ${c.description}`,
          courseIds: [c.courseId],
        },
      ],
    }));
}

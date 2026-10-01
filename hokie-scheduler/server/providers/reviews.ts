import { readFile, stat } from "node:fs/promises";
import { z } from "zod";
import { config } from "../config";
import type { ProviderResult, ReviewRecord } from "../contracts";
import { cached, fetchText } from "./http";
export const reviewEntry = z.object({
  courseId: z.string().regex(/^[A-Z]{2,5} \d{4}$/),
  professor: z.string().min(2).max(100),
  rating: z.number().min(0).max(5).nullable(),
  difficulty: z.enum(["Easy", "Moderate", "Hard", "Unknown"]),
  workload: z.string().max(100),
  url: z
    .string()
    .url()
    .refine((value) => {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        ["www.ratemyprofessors.com", "ratemyprofessors.com"].includes(
          u.hostname,
        ) &&
        /^\/professor\/\d+\/?$/.test(u.pathname)
      );
    }),
  excerpt: z.string().min(1).max(1000),
  retrievedAt: z.string().datetime(),
});
export async function reviews(): Promise<ProviderResult<ReviewRecord>> {
  if (!config.reviewFile && !config.reviewFeedUrl)
    return {
      items: [],
      status: {
        source: "ratemyprofessors",
        state: "not-configured",
        detail:
          "No permitted Rate My Professors dataset configured. Ratings and workload are not invented.",
      },
    };
  return cached("rmp-import", 60_000, async () => {
    try {
      let text: string;
      if (config.reviewFeedUrl) {
        const url = new URL(config.reviewFeedUrl);
        if (url.protocol !== "https:" || url.username || url.password)
          throw new Error("Invalid feed URL");
        text = await fetchText(url.toString(), {
          headers: config.reviewFeedToken
            ? { Authorization: `Bearer ${config.reviewFeedToken}` }
            : {},
        });
      } else {
        if ((await stat(config.reviewFile)).size > 1_000_000)
          throw new Error("Import too large");
        text = await readFile(config.reviewFile, "utf8");
      }
      const data = z.array(reviewEntry).max(2000).parse(JSON.parse(text));
      const fresh = data.filter((r) => {
        const age = Date.now() - Date.parse(r.retrievedAt);
        return age >= 0 && age < 180 * 86400000;
      });
      return {
        items: fresh.map((r, i) => ({
          courseId: r.courseId,
          professor: r.professor,
          rating: r.rating,
          difficulty: r.difficulty,
          workload: r.workload,
          citation: {
            id: `rmp-${i}`,
            source: "ratemyprofessors" as const,
            title: `Rate My Professors · ${r.professor} · ${r.courseId}`,
            url: r.url,
            retrievedAt: r.retrievedAt,
            excerpt: r.excerpt,
            courseIds: [r.courseId],
          },
        })),
        status: {
          source: "ratemyprofessors",
          state: "ready",
          detail: `${fresh.length} permitted review records (maximum age: 180 days). Student opinions, not official course facts.`,
        },
      };
    } catch {
      return {
        items: [],
        status: {
          source: "ratemyprofessors",
          state: "unavailable",
          detail:
            "The permitted review feed or import is unavailable or invalid. Check its credentials and documented JSON format.",
        },
      };
    }
  });
}

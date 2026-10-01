import { load } from "cheerio";
import type { SourceCitation } from "../../src/types";
import { cached, clean, fetchText } from "./http";
export const CS_INFORMATION =
  "https://students.cs.vt.edu/undergraduate-programs/current-students/course-information-and-course-offerings.html";
export function parseDepartment(
  html: string,
  retrievedAt = new Date().toISOString(),
) {
  const $ = load(html);
  const result = new Map<
    string,
    { id: string; name: string; citation: SourceCitation }
  >();
  $("li").each((_, node) => {
    const text = clean($(node).text());
    const match = text.match(/^CS\s+(\d{4})\s*:\s*([^()]+)/);
    if (!match || text.length > 1000) return;
    const id = `CS ${match[1]}`;
    if (!result.has(id))
      result.set(id, {
        id,
        name: match[2].trim().replace(/[.,;]$/, ""),
        citation: {
          id: `vt-department-CS-${match[1]}`,
          source: "vt-department",
          title: "VT Computer Science course information",
          url: CS_INFORMATION,
          retrievedAt,
          excerpt: text,
          courseIds: [id],
        },
      });
  });
  if (!result.size) throw new Error("Department page layout unavailable");
  return [...result.values()];
}
export async function department(subjects: string[]) {
  if (!subjects.includes("CS")) return [];
  try {
    return await cached("vt-cs-information", 86400000, async () =>
      parseDepartment(await fetchText(CS_INFORMATION)),
    );
  } catch {
    return [];
  }
}

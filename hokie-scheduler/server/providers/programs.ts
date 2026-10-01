import { load } from "cheerio";
import { cached, clean, fetchText } from "./http";
export const PROGRAM_INDEX =
  "https://www.registrar.vt.edu/graduation-multi-brief/checksheets.html";
export interface ProgramResource {
  id: string;
  name: string;
  option: string;
  documents: { year: string; url: string }[];
}
export function parsePrograms(html: string): ProgramResource[] {
  const $ = load(html);
  // Only the alphabetic majors table. Other tables contain minors and duplicate listings.
  const table = $("table")
    .filter(
      (_, el) =>
        clean($(el).find("tr").first().find("td").first().text()) === "Majors",
    )
    .first();
  const programs: ProgramResource[] = [];
  table
    .find("tr")
    .slice(1)
    .each((_, row) => {
      const cells = $(row).children("td");
      const name = clean(cells.eq(0).text());
      const option = clean(cells.eq(1).text());
      if (!name || cells.length < 3) return;
      const documents: ProgramResource["documents"] = [];
      cells
        .slice(2)
        .find("a[href]")
        .each((_, a) => {
          const year = clean($(a).text());
          try {
            const url = new URL($(a).attr("href")!, PROGRAM_INDEX);
            if (
              url.protocol === "https:" &&
              url.hostname === "www.registrar.vt.edu" &&
              /\.pdf$/i.test(url.pathname) &&
              /^20\d{2}(?:\/20\d{2})?$/.test(year)
            )
              documents.push({ year, url: url.href });
          } catch {
            /* Ignore malformed source links. */
          }
        });
      if (documents.length)
        programs.push({ id: `${name}|${option}`, name, option, documents });
    });
  if (!programs.length) throw new Error("Major directory layout unavailable");
  return programs;
}
export async function programs() {
  const items = await cached("vt-program-directory", 86400000, async () => ({
    programs: parsePrograms(await fetchText(PROGRAM_INDEX)),
    retrievedAt: new Date().toISOString(),
  }));
  return {
    ...items,
    sourceUrl: PROGRAM_INDEX,
    currentUrl: "https://catalog.vt.edu/undergraduate/",
    planningUrl:
      "https://eng.vt.edu/undergraduate/resources-support/program-requirements.html",
    notice:
      "This is VT’s legacy major/option directory, not a complete list of current majors. These checksheets apply only to their labeled years. For 2024–2025 onward, use the program requirements and roadmap in your catalog year. Links alone do not verify that a course satisfies your degree.",
  };
}

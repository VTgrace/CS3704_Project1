import { importedCatalog } from "./catalogImport";
import { load } from "cheerio";
import type {
  EvidenceCourse,
  ProviderContext,
  ProviderResult,
} from "../contracts";
import { SUBJECTS } from "../contracts";
import type { SourceCitation } from "../../src/types/index";
import { cached, clean, fetchText } from "./http";
const ROOT = "https://selfservice.banner.vt.edu/ssb/";
const CATALOG = "https://catalog.vt.edu/undergraduate/course-descriptions/";
export function termCode(semester: string): string {
  const [season, year] = semester.split(" ");
  return (
    year +
    ({ Spring: "01", Summer: "07", Fall: "09", Winter: "12" }[season] || "")
  );
}
export function parseTime(text: string): number | null {
  const m = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12 || Number(m[2]) > 59)
    return null;
  return (
    (Number(m[1]) % 12) * 60 +
    Number(m[2]) +
    (m[3].toUpperCase() === "PM" ? 720 : 0)
  );
}
function shell(
  id: string,
  name: string,
  credits: number,
  subject: string,
): EvidenceCourse {
  return {
    id,
    name,
    credits,
    major:
      subject === "CS"
        ? "Computer Science"
        : ["ECE", "MATH", "STAT", "PHYS", "CHEM"].includes(subject)
          ? "Engineering"
          : "General Education",
    difficulty: "Unknown",
    rating: null,
    professor: "Not listed",
    workload: "Not enough evidence",
    modality: "Unknown",
    tags: [],
    color: subject === "CS" ? "pink" : subject === "MATH" ? "blue" : "orange",
    meeting: {
      id,
      courseId: id,
      title: id,
      days: [],
      start: 0,
      end: 0,
      location: "Not listed",
      color: "pink",
    },
    reason: "",
    citations: [],
    scheduleVerified: false,
  };
}
export function parseTimetable(
  html: string,
  semester: string,
  retrievedAt = new Date().toISOString(),
): EvidenceCourse[] {
  const $ = load(html);
  const table = $(
    'table[summary="This table displays the Timetable of Classes"]',
  );
  if (!table.length) {
    if (/no (classes|sections|courses|records).*found/i.test($.text()))
      return [];
    throw new Error("VT timetable layout unavailable");
  }
  const result: EvidenceCourse[] = [];
  let current: EvidenceCourse | undefined;
  table.find("tr").each((_, row) => {
    const cells = $(row).children("td");
    const values = cells.map((_, cell) => clean($(cell).text())).get();
    if (
      /^\d{5}$/.test(values[0] || "") &&
      /^[A-Z]+-\d{4}$/.test(values[1] || "")
    ) {
      const [subject, number] = values[1].split("-");
      const id = `${subject} ${number}`;
      const credits = Number(values[5]);
      if (!Number.isFinite(credits) || credits <= 0 || Number(number) >= 5000) {
        current = undefined;
        return;
      }
      const c = shell(id, values[2], credits, subject);
      const crn = values[0];
      const begin = parseTime(values[9]),
        end = parseTime(values[10]);
      const dayText = values[8].replace(/\s/g, "");
      const days = [...dayText]
        .map((d) => ({ M: 1, T: 2, W: 3, R: 4, F: 5, S: 6, U: 0 })[d])
        .filter((d) => d !== undefined) as number[];
      c.sectionId = crn;
      c.semester = semester;
      c.professor = values[7] === "N/A" ? "Not listed" : values[7];
      c.modality = values[4].includes("Hybrid")
        ? "Hybrid"
        : values[4].includes("Online")
          ? "Online"
          : "In Person";
      c.scheduleVerified =
        values[3] === "L" &&
        !!days.length &&
        begin !== null &&
        end !== null &&
        end > begin &&
        [...dayText].every((d) => "MTWRFSU".includes(d));
      c.meeting = {
        id: `vt-${termCode(semester)}-${crn}`,
        courseId: id,
        title: id,
        days,
        start: begin ?? 0,
        end: end ?? 0,
        location: values[11] || "Not listed",
        color: c.color,
        semester,
      };
      const params = new URLSearchParams({
        CRN: crn,
        TERM: termCode(semester).slice(4),
        YEAR: semester.split(" ")[1],
        SUBJ: subject,
        CRSE: number,
        history: "N",
      });
      c.citations = [
        {
          id: `vt-${termCode(semester)}-${crn}`,
          source: "vt-timetable",
          title: `VT timetable · ${id} · CRN ${crn} · ${semester}`,
          url: ROOT + "HZSKVTSC.P_ProcComments?" + params,
          retrievedAt,
          excerpt: `${id}: ${c.name}. ${credits} credits. ${values[4]}. ${values[8]} ${values[9]}–${values[10]}; ${values[11]}. Instructor: ${values[7]}.`,
          courseIds: [id],
        },
      ];
      c.tags = [
        c.scheduleVerified ? "Timetable section" : "Meeting times unverified",
      ];
      if (values[3] !== "L")
        c.restrictions =
          "Non-lecture section; verify linked lecture/lab requirements.";
      result.push(c);
      current = c;
    } else if (
      current &&
      values.some((v) => v.includes(`Comments for CRN ${current!.sectionId}`))
    ) {
      current.restrictions = clean(values.slice(1).join(" ")).slice(0, 1600);
      if (current.restrictions)
        current.citations[0].excerpt +=
          " Section notes: " + current.restrictions;
    } else if (current && values.length >= 4 && !values[0]?.includes("CRN")) {
      // Continuation meetings must not be mistaken for a fully known single block.
      if (values.some((v) => parseTime(v) !== null)) {
        current.scheduleVerified = false;
        current.tags = ["Multiple meetings · verify section"];
      }
    }
  });
  return result;
}
export async function timetable({
  subjects,
  semester,
}: ProviderContext): Promise<ProviderResult<EvidenceCourse>> {
  return cached(
    `timetable:${semester}:${subjects.join(",")}`,
    300_000,
    async () => {
      try {
        const landing = await cached("vt-terms", 300_000, () =>
          fetchText(ROOT + "HZSKVTSC.P_DispRequest"),
        );
        const $ = load(landing);
        const terms = $('select[name="TERMYEAR"] option')
          .map((_, e) => $(e).attr("value"))
          .get();
        if (!terms.includes(termCode(semester)))
          return {
            items: [],
            status: {
              source: "vt-timetable",
              state: "unavailable",
              detail: `VT has not published ${semester} in this timetable.`,
            },
          };
        const batches = await Promise.all(
          subjects
            .filter((s) => SUBJECTS.includes(s as (typeof SUBJECTS)[number]))
            .slice(0, 3)
            .map(async (subject) => {
              const body = new URLSearchParams({
                CAMPUS: "0",
                TERMYEAR: termCode(semester),
                CORE_CODE: "AR%",
                subj_code: subject,
                SCHDTYPE: "%",
                CRSE_NUMBER: "",
                crn: "",
                open_only: "",
                disp_comments_in: "Y",
                sess_code: "%",
                BTN_PRESSED: "FIND class sections",
                inst_name: "",
              });
              return parseTimetable(
                await fetchText(ROOT + "HZSKVTSC.P_ProcRequest", {
                  method: "POST",
                  body,
                }),
                semester,
              );
            }),
        );
        return {
          items: batches.flat(),
          status: {
            source: "vt-timetable",
            state: "ready",
            detail: `Official ${semester} timetable · ${subjects.join(", ")} · cached for up to 5 minutes. Seat availability and prerequisites require verification.`,
          },
        };
      } catch {
        return {
          items: [],
          status: {
            source: "vt-timetable",
            state: "unavailable",
            detail:
              "VT timetable could not be retrieved. No mock sections were substituted.",
          },
        };
      }
    },
  );
}
export function parseCatalog(
  html: string,
  subject: string,
  retrievedAt = new Date().toISOString(),
): EvidenceCourse[] {
  const $ = load(html);
  const result: EvidenceCourse[] = [];
  $(".courseblock").each((_, element) => {
    const block = $(element);
    const title = clean(block.find(".courseblocktitle").text());
    const m = title.match(
      /^([A-Z]+)\s*(\d{4})\s*[-–:]?\s*(.*?)\s*\((\d+)\s*credits?\)/i,
    );
    if (!m || Number(m[2]) >= 5000) return;
    const c = shell(`${m[1]} ${m[2]}`, m[3], Number(m[4]), subject);
    c.description = clean(block.find(".courseblockdesc").text()).slice(0, 1600);
    const citation: SourceCitation = {
      id: `catalog-${m[1]}-${m[2]}`,
      source: "vt-catalog",
      title: `VT catalog · ${c.id}`,
      url: CATALOG + subject.toLowerCase() + "/",
      retrievedAt,
      excerpt: `${title}. ${c.description}`,
      courseIds: [c.id],
    };
    c.citations = [citation];
    c.tags = ["Catalog only · verify offering"];
    result.push(c);
  });
  if (!result.length) throw new Error("No supported catalog records");
  return result;
}
export async function catalog(
  subjects: string[],
): Promise<ProviderResult<EvidenceCourse>> {
  return cached(`catalog:${subjects.join(",")}`, 3_600_000, async () => {
    const results = await Promise.allSettled(
      subjects
        .slice(0, 3)
        .map(async (subject) =>
          parseCatalog(
            await fetchText(CATALOG + subject.toLowerCase() + "/"),
            subject,
          ),
        ),
    );
    const items = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );
    let snapshots: EvidenceCourse[] = [];
    try {
      snapshots = await importedCatalog(subjects);
    } catch {
      /* Status below stays unavailable if neither source is usable. */
    }
    const snapshotItems = snapshots.filter(
      (c) => !items.some((live) => live.id === c.id),
    );
    items.push(...snapshotItems);
    return {
      items,
      status: {
        source: "vt-catalog",
        state: items.length > 0 ? "ready" : "unavailable",
        detail: items.length
          ? `Official catalog records available; ${snapshotItems.length} from dated local snapshots. Coverage may be partial.`
          : "Catalog retrieval is unavailable. Timetable evidence is shown separately.",
      },
    };
  });
}

import { conflicts } from "../src/services/scheduler";
import type {
  RecommendationRequest,
  RecommendationResponse,
} from "../src/types/index";
import type { Dependencies, EvidenceCourse, RankedCourse } from "./contracts";
import { SUBJECTS } from "./contracts";
import { parseTime } from "./providers/vt";
export function subjectsFor(request: RecommendationRequest): string[] {
  const prompt = request.prompt.toUpperCase();
  const explicit = SUBJECTS.filter((s) =>
    new RegExp(`\\b${s}\\b`).test(prompt),
  );
  if (explicit.length) return explicit.slice(0, 3);
  if (/GEN ED|GENERAL EDUCATION|PATHWAYS/.test(prompt))
    return ["ENGL", "ART", "PSYC"];
  return request.filters.major === "Engineering"
    ? ["ECE", "MATH", "STAT"]
    : request.filters.major === "General Education"
      ? ["ENGL", "ART", "PSYC"]
      : ["CS", "ENGL", "ART"];
}
export function eligible(
  course: EvidenceCourse,
  request: RecommendationRequest,
): boolean {
  const f = request.filters;
  const prompt = request.prompt.toLowerCase();
  if (course.semester && course.semester !== f.semester) return false;
  if (request.events.some((e) => e.courseId === course.id)) return false;
  if (
    f.major !== "Any" &&
    course.major !== f.major &&
    course.major !== "General Education"
  )
    return false;
  if (f.credits !== "Any" && course.credits !== Number(f.credits)) return false;
  if (
    f.rating !== "Any" &&
    (course.rating === null || course.rating < parseFloat(f.rating))
  )
    return false;
  if (f.difficulty !== "Any" && course.difficulty !== f.difficulty)
    return false;
  if (f.modality !== "Any" && course.modality !== f.modality) return false;
  if (!course.scheduleVerified) return false; // Catalog-only records cannot establish a fit.
  if (course.meeting.start < 480 || course.meeting.end > 1200) return false; // Current calendar display range.
  if (
    request.events.some(
      (e) =>
        (!e.semester || e.semester === f.semester) &&
        conflicts(e, course.meeting),
    )
  )
    return false;
  if (f.time === "Morning" && course.meeting.end > 720) return false;
  if (
    f.time === "Afternoon" &&
    (course.meeting.start < 720 || course.meeting.end > 1020)
  )
    return false;
  if (f.time === "Evening" && course.meeting.start < 1020) return false;
  const credits = prompt.match(/\b([1-4])[- ]credit/);
  if (credits && course.credits !== Number(credits[1])) return false;
  if (
    /cs electives?/.test(prompt) &&
    (!course.id.startsWith("CS ") || Number(course.id.split(" ")[1]) < 3000)
  )
    return false;
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  for (let day = 0; day < 7; day++) {
    const name = days[day];
    if (
      new RegExp(
        `(?:no|not on|avoid|free|without)\\s+(?:classes\\s+(?:on\\s+)?)?${name}`,
      ).test(prompt) &&
      course.meeting.days.includes(day)
    )
      return false;
    if (
      new RegExp(`(?:on|only)\\s+${name}`).test(prompt) &&
      !course.meeting.days.includes(day)
    )
      return false;
  }
  if (/no morning|avoid morning/.test(prompt) && course.meeting.start < 720)
    return false;
  const lower = prompt.match(
    /(?:after|not before|no classes before)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/,
  );
  const upper = prompt.match(
    /(?:before|end by|finish by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/,
  );
  if (lower) {
    const limit = parseTime(`${lower[1]}:${lower[2] ?? "00"}${lower[3]}`);
    if (limit !== null && course.meeting.start < limit) return false;
  }
  if (upper && !lower) {
    const limit = parseTime(`${upper[1]}:${upper[2] ?? "00"}${upper[3]}`);
    if (limit !== null && course.meeting.end > limit) return false;
  }

  return true;
}
export function validateRanking(
  ranked: RankedCourse[],
  candidates: EvidenceCourse[],
): EvidenceCourse[] {
  const result: EvidenceCourse[] = [];
  const seen = new Set<string>();
  for (const rank of ranked.slice(0, 3)) {
    const c = candidates.find(
      (c) => c.id === rank.courseId && (c.sectionId ?? "") === rank.sectionId,
    );
    if (
      !c ||
      seen.has(c.id) ||
      !rank.reason.trim() ||
      rank.reason.length > 1200 ||
      !rank.citationIds.length ||
      rank.citationIds.some((id) => !c.citations.some((s) => s.id === id))
    )
      throw new Error("Unverifiable LLM recommendation");
    if (/https?:\/\//i.test(rank.reason))
      throw new Error("Unverified URL in response");
    seen.add(c.id);
    result.push({
      ...c,
      reason: rank.reason,
      citations: c.citations.filter((s) => rank.citationIds.includes(s.id)),
    });
  }
  return result;
}
export async function recommend(
  request: RecommendationRequest,
  deps: Dependencies,
): Promise<RecommendationResponse> {
  const subjects = subjectsFor(request);
  const [tt, cat, reviews] = await Promise.all([
    deps.timetable({ subjects, semester: request.filters.semester }),
    deps.catalog(subjects),
    deps.reviews(),
  ]);
  const catalogById = new Map(cat.items.map((c) => [c.id, c]));
  const all = tt.items.map((c) => {
    const description = catalogById.get(c.id);
    const review = reviews.items.find(
      (r) =>
        r.courseId === c.id &&
        r.professor.trim().toLowerCase() === c.professor.trim().toLowerCase(),
    );
    return {
      ...c,
      description: description?.description,
      citations: [
        ...c.citations,
        ...(description?.citations ?? []),
        ...(review ? [review.citation] : []),
      ],
      rating: review?.rating ?? null,
      difficulty: review?.difficulty ?? "Unknown",
      workload: review?.workload ?? "Not enough evidence",
    };
  });
  const candidates = all.filter((c) => eligible(c, request));
  const terms = request.prompt
    .toLowerCase()
    .split(/\W+/)
    .filter(
      (s) =>
        s.length > 3 &&
        ![
          "want",
          "class",
          "course",
          "that",
          "with",
          "around",
          "these",
          "easy",
          "elective",
          "schedule",
          "classes",
          "courses",
        ].includes(s),
    );
  const score = (c: EvidenceCourse) =>
    terms.reduce(
      (n, t) =>
        n +
        (`${c.id} ${c.name} ${c.description ?? ""}`.toLowerCase().includes(t)
          ? 1
          : 0),
      0,
    ) +
    (c.rating ?? 0) / 10;
  candidates.sort(
    (a, b) =>
      score(b) - score(a) ||
      a.id.localeCompare(b.id) ||
      String(a.sectionId).localeCompare(String(b.sectionId)),
  );
  const unique: EvidenceCourse[] = [];
  for (const c of candidates) {
    if (!unique.some((x) => x.id === c.id)) unique.push(c);
    if (unique.length === 12) break;
  }
  const discussion = await deps.reddit(unique.slice(0, 3).map((c) => c.id));
  for (const c of unique)
    c.citations.push(
      ...discussion.items.filter((s) => s.courseIds.includes(c.id)),
    );
  const statuses = [tt.status, cat.status, reviews.status, discussion.status];
  const warnings = [
    "Each option fits independently; these are alternatives, not a guaranteed combined schedule.",
    "Meeting times were checked against your supplied events. Prerequisites, linked labs, major restrictions, and available seats still need confirmation.",
  ];
  if (
    /easy|workload|difficulty|professor|rated/i.test(request.prompt) &&
    !unique.some((c) => c.rating !== null)
  )
    warnings.push(
      "There is not enough matching review evidence to verify difficulty, workload, or professor quality.",
    );
  let mode: RecommendationResponse["mode"] = "retrieval";
  let selected = unique.slice(0, 3).map((c) => ({
    ...c,
    tags: ["VT timetable", "No time overlap"],
    reason: `${c.id} has a ${c.credits}-credit ${request.filters.semester} section with no overlap with your supplied commitments. ${c.rating !== null ? "Imported professor review evidence is available." : "Difficulty, workload, and professor quality are unverified."}`,
  }));
  if (deps.rank && unique.length) {
    try {
      selected = validateRanking(await deps.rank(request, unique), unique);
      mode = "llm";
    } catch {
      warnings.push(
        "The LLM was unavailable or returned an unverifiable answer. Showing deterministic timetable matches instead.",
      );
    }
  }
  if (/elective|gen ed|pathways/i.test(request.prompt))
    warnings.push(
      "Degree-specific elective and Pathways eligibility have not been verified.",
    );
  if (!deps.rank)
    warnings.push(
      "LLM is not configured. These are source-based timetable matches, not an AI-generated answer.",
    );
  return {
    courses: selected,
    explanation: selected.length
      ? `${selected.length} source-backed ${selected.length === 1 ? "option" : "options"} for ${request.filters.semester}. ${mode === "llm" ? "Ranked by the LLM using the cited evidence." : "Matched by the backend; review the citations and section restrictions."}`
      : "No verified sections match the current request and filters. Check source availability, choose a published term, or broaden the filters.",
    mode,
    sources: statuses,
    warnings,
  };
}

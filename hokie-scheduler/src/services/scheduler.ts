import { courses } from "../data/mockData";
import type {
  Course,
  Filters,
  RecommendationRequest,
  RecommendationResponse,
  ScheduleEvent,
} from "../types";
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function occursOn(event: ScheduleEvent, date: Date): boolean {
  return event.date
    ? event.date === dateKey(date)
    : event.days.includes(date.getDay());
}
export function conflicts(a: ScheduleEvent, b: ScheduleEvent): boolean {
  if (a.end <= b.start || a.start >= b.end) return false;
  if (a.date && b.date) return a.date === b.date;
  if (a.date) return b.days.includes(new Date(a.date + "T12:00:00").getDay());
  if (b.date) return a.days.includes(new Date(b.date + "T12:00:00").getDay());
  return a.days.some((day) => b.days.includes(day));
}
export function filterCourses(source: Course[], filters: Filters): Course[] {
  return source.filter(
    (course) =>
      (filters.major === "Any" ||
        course.major === filters.major ||
        course.major === "General Education") &&
      (filters.difficulty === "Any" ||
        course.difficulty === filters.difficulty) &&
      (filters.rating === "Any" ||
        course.rating >= parseFloat(filters.rating)) &&
      (filters.credits === "Any" ||
        course.credits === Number(filters.credits)) &&
      (filters.modality === "Any" || course.modality === filters.modality) &&
      (filters.time === "No Preference" ||
        (filters.time === "Morning"
          ? course.meeting.start < 720
          : filters.time === "Afternoon"
            ? course.meeting.start >= 720 && course.meeting.start < 1020
            : course.meeting.start >= 1020)),
  );
}
// Replace this adapter with a real HTTP request; the UI consumes the same response shape.
export async function recommendCourses({
  prompt,
  filters,
  events,
}: RecommendationRequest): Promise<RecommendationResponse> {
  await new Promise((resolve) => setTimeout(resolve, 850));
  const query = prompt.toLowerCase();
  let matches = filterCourses(courses, filters).filter(
    (course) =>
      !events.some(
        (event) =>
          event.courseId === course.id || conflicts(course.meeting, event),
      ),
  );
  if (query.includes("easy"))
    matches = matches.filter((c) => c.difficulty === "Easy");
  if (query.includes("gen ed"))
    matches = matches.filter((c) => c.major === "General Education");
  if (query.includes("cs elective"))
    matches = matches.filter((c) => c.major === "Computer Science");
  if (query.includes("friday"))
    matches = matches.filter((c) => c.meeting.days.includes(5));
  if (query.includes("3 credit"))
    matches = matches.filter((c) => c.credits === 3);
  return {
    courses: matches,
    explanation: matches.length
      ? `Found ${matches.length} sample ${matches.length === 1 ? "course" : "courses"} that fit your request, filters, and current commitments.`
      : "No sample courses match all your preferences. Try a broader request or reset your filters.",
  };
}
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${h % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export function meetingDays(days: number[]): string {
  return days
    .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
    .join(" / ");
}

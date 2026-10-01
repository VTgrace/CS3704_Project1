import { courses } from "../data/mockData";
import { filterCourses, conflicts } from "./scheduler";
import type { RecommendationRequest, RecommendationResponse } from "../types";
// Replace this adapter with a real HTTP request; the UI consumes the same response shape.
export async function mockRecommendCourses({
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

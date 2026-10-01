export type Color = "pink" | "blue" | "orange" | "green" | "purple";
export type View = "Day" | "Week" | "Month";
export type Page = "Dashboard" | "Explore Courses" | "Compare Schedules";
export interface ScheduleEvent {
  id: string;
  title: string;
  days: number[];
  start: number;
  end: number;
  location: string;
  color: Color;
  notes?: string;
  date?: string;
  courseId?: string;
  semester?: string;
}
export interface Course {
  id: string;
  name: string;
  credits: number;
  major: string;
  difficulty: string;
  rating: number | null;
  professor: string;
  workload: string;
  modality: string;
  tags: string[];
  color: Color;
  meeting: ScheduleEvent;
  reason: string;
  citations?: SourceCitation[];
  scheduleVerified?: boolean;
  sectionId?: string;
  semester?: string;
  restrictions?: string;
}
export interface Filters {
  semester: string;
  major: string;
  difficulty: string;
  rating: string;
  credits: string;
  time: string;
  modality: string;
}
export interface RecommendationRequest {
  prompt: string;
  filters: Filters;
  events: ScheduleEvent[];
  history?: { role: "user" | "assistant"; content: string }[];
}
export interface RecommendationResponse {
  courses: Course[];
  explanation: string;
  mode?: "llm" | "retrieval";
  sources?: SourceStatus[];
  warnings?: string[];
}
export type ScheduleOption = "A" | "B" | "best";

export interface SourceCitation {
  id: string;
  source: "vt-catalog" | "vt-timetable" | "ratemyprofessors" | "reddit";
  title: string;
  url: string;
  retrievedAt: string;
  excerpt: string;
  courseIds: string[];
}
export interface SourceStatus {
  source: SourceCitation["source"];
  state: "ready" | "unavailable" | "not-configured";
  detail: string;
}
export interface ChatTurn {
  prompt: string;
  response: RecommendationResponse;
}

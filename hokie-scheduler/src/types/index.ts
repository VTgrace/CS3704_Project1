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
}
export interface Course {
  id: string;
  name: string;
  credits: number;
  major: string;
  difficulty: string;
  rating: number;
  professor: string;
  workload: string;
  modality: string;
  tags: string[];
  color: Color;
  meeting: ScheduleEvent;
  reason: string;
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
}
export interface RecommendationResponse {
  courses: Course[];
  explanation: string;
}
export type ScheduleOption = "A" | "B" | "best";

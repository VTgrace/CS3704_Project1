import { z } from "zod";
import type {
  Course,
  RecommendationRequest,
  SourceCitation,
  SourceStatus,
} from "../src/types/index";
export const SUBJECTS = [
  "CS",
  "MATH",
  "ENGL",
  "ART",
  "STAT",
  "ECE",
  "PSYC",
  "HIST",
  "PHYS",
  "BIOL",
  "CHEM",
  "COMM",
  "GEOG",
  "SOC",
  "MUS",
] as const;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value + "T12:00:00Z")) &&
      new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value,
    "Invalid date",
  );
export const eventSchema = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().max(100),
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    start: z.number().int().min(0).max(1439),
    end: z.number().int().min(1).max(1440),
    location: z.string().max(200),
    color: z.enum(["pink", "blue", "orange", "green", "purple"]),
    notes: z.string().max(500).optional(),
    date: date.optional(),
    courseId: z.string().max(30).optional(),
    semester: z.string().max(30).optional(),
  })
  .refine((e) => e.end > e.start, "End must be after start");
export const filtersSchema = z.object({
  semester: z.string().regex(/^(Fall|Spring|Summer|Winter) 20\d{2}$/),
  major: z.enum([
    "Computer Science",
    "Engineering",
    "General Education",
    "Any",
  ]),
  difficulty: z.enum(["Any", "Easy", "Moderate", "Hard"]),
  rating: z.enum(["Any", "3.0+", "4.0+", "4.5+"]),
  credits: z.enum(["Any", "1", "2", "3", "4"]),
  time: z.enum(["No Preference", "Morning", "Afternoon", "Evening"]),
  modality: z.enum(["Any", "In Person", "Online", "Hybrid"]),
});
export const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  filters: filtersSchema,
  events: z.array(eventSchema).max(100),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(8)
    .optional(),
});
export interface ProviderResult<T> {
  items: T[];
  status: SourceStatus;
}
export interface EvidenceCourse extends Course {
  citations: SourceCitation[];
  description?: string;
  sectionId?: string;
  semester?: string;
  scheduleVerified: boolean;
  restrictions?: string;
}
export interface ReviewRecord {
  courseId: string;
  professor: string;
  rating: number | null;
  difficulty: "Easy" | "Moderate" | "Hard" | "Unknown";
  workload: string;
  citation: SourceCitation;
}
export interface ProviderContext {
  subjects: string[];
  semester: string;
}
export interface Dependencies {
  timetable: (
    context: ProviderContext,
  ) => Promise<ProviderResult<EvidenceCourse>>;
  catalog: (subjects: string[]) => Promise<ProviderResult<EvidenceCourse>>;
  reviews: () => Promise<ProviderResult<ReviewRecord>>;
  reddit: (courseIds: string[]) => Promise<ProviderResult<SourceCitation>>;
  rank?: (
    request: RecommendationRequest,
    candidates: EvidenceCourse[],
  ) => Promise<RankedCourse[]>;
}
export interface RankedCourse {
  courseId: string;
  sectionId: string;
  reason: string;
  citationIds: string[];
}

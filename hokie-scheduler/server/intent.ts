import { SUBJECTS } from "./contracts";
// Recognize common department names, not just timetable abbreviations.
const aliases: Record<string, RegExp> = {
  CS: /\bcomputer science\b/i,
  PSYC: /\bpsych(?:ology)?\b/i,
  MATH: /\bmath(?:ematics)?\b/i,
  ENGL: /\benglish\b/i,
  STAT: /\bstat(?:istics)?\b/i,
  BIOL: /\bbiolog(?:y|ical sciences)\b/i,
  CHEM: /\bchemistry\b/i,
  PHYS: /\bphysics\b/i,
  HIST: /\bhistory\b/i,
  SOC: /\bsociology\b/i,
  GEOG: /\bgeography\b/i,
  COMM: /\bcommunications?\b/i,
  MUS: /\bmusic\b/i,
};
export function requestedSubjects(prompt: string): string[] {
  return SUBJECTS.filter(
    (s) =>
      new RegExp(`\\b${s}(?=\\b|\\d{4}\\b)`, "i").test(prompt) ||
      aliases[s]?.test(prompt),
  );
}

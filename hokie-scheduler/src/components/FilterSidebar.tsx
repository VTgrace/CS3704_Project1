import { MajorResources } from "./MajorResources";
import {
  CalendarDays,
  GraduationCap,
  ChartNoAxesColumnIncreasing,
  Star,
  Database,
  Clock3,
  Monitor,
  Lightbulb,
  X,
} from "lucide-react";
import type { Filters } from "../types";
const fields = [
  {
    key: "semester",
    label: "Semester",
    icon: CalendarDays,
    values: ["Fall 2026", "Spring 2027"],
  },
  {
    key: "major",
    label: "Major",
    icon: GraduationCap,
    values: ["Computer Science", "Engineering", "General Education", "Any"],
  },
  {
    key: "difficulty",
    label: "Difficulty",
    icon: ChartNoAxesColumnIncreasing,
    values: ["Any", "Easy", "Moderate", "Hard"],
  },
  {
    key: "rating",
    label: "Professor Rating",
    icon: Star,
    values: ["Any", "3.0+", "4.0+", "4.5+"],
  },
  {
    key: "credits",
    label: "Credits",
    icon: Database,
    values: ["Any", "1", "2", "3", "4"],
  },
  {
    key: "time",
    label: "Time Preference",
    icon: Clock3,
    values: ["No Preference", "Morning", "Afternoon", "Evening"],
  },
  {
    key: "modality",
    label: "Modality",
    icon: Monitor,
    values: ["Any", "In Person", "Online", "Hybrid"],
  },
] as const;
export function FilterSidebar({
  filters,
  onChange,
  onReset,
  open,
  onClose,
}: {
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
  onReset: () => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {open && (
        <button
          className="drawer-backdrop"
          aria-label="Close filters"
          onClick={onClose}
        />
      )}
      <aside
        className={`panel filters ${open ? "drawer-open" : ""}`}
        aria-label="Course filters"
      >
        <div className="section-heading">
          <h2>Filters</h2>
          <button className="text-button" onClick={onReset}>
            Reset
          </button>
          <button
            className="icon-button drawer-close"
            aria-label="Close filters"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <div className="filter-fields">
          {fields.map(({ key, label, icon: Icon, values }) => (
            <label className="filter-field" key={key}>
              <Icon size={20} />
              <span>
                {label}
                <select
                  value={filters[key]}
                  onChange={(e) => onChange(key, e.target.value)}
                >
                  {values.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </span>
            </label>
          ))}
        </div>
        <MajorResources
          programName={filters.program}
          catalogYear={filters.catalogYear}
          onChange={onChange}
        />
        <div className="tip-card">
          <Lightbulb size={23} />
          <div>
            <strong>Not sure what to look for?</strong>
            <p>
              Try natural language! Tell us what you need and we’ll do the rest.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

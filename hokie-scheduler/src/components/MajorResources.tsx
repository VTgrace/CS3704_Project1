import { DegreeChecker } from "./DegreeChecker";
import { useEffect, useState } from "react";
interface Directory {
  programs: {
    id: string;
    name: string;
    option: string;
    documents: { year: string; url: string }[];
  }[];
  notice: string;
  sourceUrl: string;
  currentUrl: string;
  retrievedAt: string;
}
export function MajorResources({
  programName,
  catalogYear,
  onChange,
}: {
  programName?: string;
  catalogYear?: string;
  onChange: (key: "program" | "catalogYear", value: string) => void;
}) {
  const [data, setData] = useState<Directory | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [year, setYear] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || data) return;
    const controller = new AbortController();
    fetch("/api/programs", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            "Could not load VT’s directory. Use the official links below.",
          );
        setData(await r.json());
        setError("");
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [open, data]);
  const program = data?.programs.find((p) => p.id === selected);
  const document = program?.documents.find((d) => d.year === year);
  return (
    <details
      className="major-resources"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Major roadmaps &amp; requirements</summary>
      <p>
        Use your catalog year from DARS to find the correct degree plan. A
        roadmap is a sample sequence; it does not establish semester
        availability.
      </p>
      <label>
        Your degree program
        <input
          value={programName ?? ""}
          placeholder="Major and option / concentration"
          onChange={(e) => onChange("program", e.target.value)}
        />
      </label>
      <label>
        Your catalog year
        <select
          value={catalogYear ?? ""}
          onChange={(e) => onChange("catalogYear", e.target.value)}
        >
          <option value="" disabled>
            Select your DARS catalog year
          </option>
          {Array.from(
            { length: Math.max(1, new Date().getFullYear() - 2000 + 1) },
            (_, i) => new Date().getFullYear() - i,
          ).map((y) => (
            <option key={y} value={`${y}–${y + 1}`}>
              {y}–{y + 1}
            </option>
          ))}
        </select>
      </label>
      <DegreeChecker
        key={`${programName}|${catalogYear}`}
        programName={programName}
        catalogYear={catalogYear}
      />
      <p>
        <a
          href="https://catalog.vt.edu/previous-publications/"
          target="_blank"
          rel="noreferrer"
        >
          Previous catalog years ↗
        </a>
      </p>
      <p>
        <a
          href="https://catalog.vt.edu/undergraduate/"
          target="_blank"
          rel="noreferrer"
        >
          Current VT programs and roadmaps ↗
        </a>
      </p>
      <p>
        2024–2025 onward: select your program and catalog year on VT’s site. The
        checker shows which program/year rules are available; missing years are
        not inferred.
      </p>
      <h3>Earlier checksheets</h3>
      {!data && !error && open && <p role="status">Loading VT’s directory…</p>}
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <label>
            Search legacy majors and options
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. biology, accounting, computer science"
            />
          </label>
          <label>
            Major / option
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setYear("");
                const p = data.programs.find((p) => p.id === e.target.value);
                if (p) onChange("program", `${p.name} — ${p.option}`);
              }}
            >
              <option value="">Select a major</option>
              {data.programs
                .filter(
                  (p) =>
                    p.id === selected ||
                    `${p.name} ${p.option}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name} — {p.option}
                  </option>
                ))}
            </select>
          </label>
          {program && (
            <label>
              Checksheet year
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Select the applicable year</option>
                {program.documents.map((d) => (
                  <option key={d.url} value={d.year}>
                    {d.year}
                  </option>
                ))}
              </select>
            </label>
          )}
          {document && (
            <p>
              <a href={document.url} target="_blank" rel="noreferrer">
                Open {year} checksheet PDF ↗
              </a>
            </p>
          )}
          <p>{data.notice}</p>
          <small>
            Retrieved {new Date(data.retrievedAt).toLocaleDateString()} ·{" "}
            {data.programs.length} legacy major/option entries
          </small>
        </>
      )}
      <p>
        <a
          href="https://www.registrar.vt.edu/graduation-multi-brief/checksheets.html"
          target="_blank"
          rel="noreferrer"
        >
          Official VT checksheet directory ↗
        </a>
      </p>
    </details>
  );
}

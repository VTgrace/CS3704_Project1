import { useEffect, useState } from "react";
interface Plan {
  id: string;
  program: string;
  catalogYear: string;
  ruleCount: number;
}
interface Result {
  program: string;
  catalogYear: string;
  metCount: number;
  totalChecked: number;
  notice: string;
  rules: {
    id: string;
    label: string;
    status: string;
    alternatives: { courses: { courseId: string; status: string }[] }[];
    source: { url: string; page: number };
  }[];
  manualChecks: string[];
}
export function DegreeChecker({
  programName,
  catalogYear,
}: {
  programName?: string;
  catalogYear?: string;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/degree-plans", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load requirement coverage.");
        setPlans((await r.json()).plans);
        setLoaded(true);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);
  const plan = plans.find(
    (p) => p.program === programName && p.catalogYear === catalogYear,
  );

  async function check() {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      const attempts = entries
        .split(/\n/)
        .filter((s) => s.trim())
        .map((line) => {
          const m = line
            .trim()
            .toUpperCase()
            .match(
              /^([A-Z]{2,5})\s*(\d{4}H?)\s*[,=:]\s*(A-?|B[+-]?|C[+-]?|D[+-]?|F|P|T|IP|W)$/,
            );
          if (!m)
            throw new Error(
              "Use one course per line, for example CS 1114, A. Grades: A through F, P, T, IP or W.",
            );
          return { courseId: `${m[1]} ${m[2]}`, grade: m[3] };
        });
      const r = await fetch("/api/degree-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          catalogYear: plan.catalogYear,
          attempts,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not check requirements.",
      );
    } finally {
      setBusy(false);
    }
  }
  // Changing context during a request cannot display the previous plan's audit.
  const currentResult =
    result?.program === programName && result?.catalogYear === catalogYear
      ? result
      : null;
  return (
    <section className="degree-checker" aria-label="Degree requirement checker">
      <h3>Check course requirements</h3>
      <p>
        {plan
          ? `${plan.ruleCount} sourced rules available for this program/year. Partial coverage.`
          : loaded
            ? "No reviewed rule set matches your selected program and year yet."
            : "Loading coverage…"}
      </p>
      <details>
        <summary>Available automatic checks</summary>
        <ul>
          {plans.map((p) => (
            <li key={p.id}>
              {p.program} · {p.catalogYear} · {p.ruleCount} rules
            </li>
          ))}
        </ul>
        <p>
          Other majors and years require a reviewed rule set. A checksheet link
          alone is not an automatic check.
        </p>
      </details>
      {plan && (
        <>
          <label>
            Completed and in-progress courses
            <textarea
              disabled={busy}
              rows={5}
              value={entries}
              onChange={(e) => {
                setEntries(e.target.value);
                setResult(null);
                setError("");
              }}
              placeholder={"CS 1114, A\nCS 2114, IP"}
            />
          </label>
          <p>
            Use your VT course equivalencies. P/T credits need review; IP means
            in progress. Grades stay in this local backend and are not sent to
            the LLM.
          </p>
          <button type="button" onClick={check} disabled={busy}>
            {busy ? "Checking…" : "Check requirements"}
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {currentResult && (
        <>
          <p role="status">
            {currentResult.metCount} of {currentResult.totalChecked} checked
            rules met based on your entries.
          </p>
          <p>{currentResult.notice}</p>
          <ul>
            {currentResult.rules.map((r) => (
              <li key={r.id}>
                <strong>
                  {r.label}: {r.status.replaceAll("-", " ")}
                </strong>
                <details>
                  <summary>Eligible courses &amp; source</summary>
                  <p>
                    {r.alternatives
                      .map((a) =>
                        a.courses
                          .map((c) => `${c.courseId} (${c.status})`)
                          .join(" + "),
                      )
                      .join(" OR ")}
                  </p>
                  <a
                    href={`${r.source.url}#page=${r.source.page}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official requirement · page {r.source.page} ↗
                  </a>
                </details>
              </li>
            ))}
          </ul>
          <details>
            <summary>Requirements still needing review</summary>
            <ul>
              {currentResult.manualChecks.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}

import type { ChatTurn } from "../types";
import { SourceCitations } from "./SourceCitations";
export function ChatHistory({ turns }: { turns: ChatTurn[] }) {
  if (!turns.length) return null;
  return (
    <section className="chat-history" aria-label="Recommendation conversation">
      {turns.map((turn, index) => (
        <article key={index}>
          <p className="chat-user">{turn.prompt}</p>
          <div className="chat-answer">
            <span className="response-mode">
              {turn.response.mode === "llm"
                ? "AI · cited evidence"
                : "Timetable matches · AI not used"}
            </span>
            <p>{turn.response.explanation}</p>
            {turn.response.courses.map((course) => (
              <div className="chat-course" key={course.id}>
                <strong>
                  {course.id} · {course.name}
                </strong>
                <p>{course.reason}</p>
                <SourceCitations citations={course.citations ?? []} />
              </div>
            ))}
            {!!turn.response.warnings?.length && (
              <ul className="evidence-notes">
                {turn.response.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            <details className="source-availability">
              <summary>Source availability</summary>
              {turn.response.sources?.map((source) => (
                <p key={source.source}>
                  <strong>
                    {source.source}: {source.state}
                  </strong>
                  <br />
                  {source.detail}
                </p>
              ))}
            </details>
          </div>
        </article>
      ))}
    </section>
  );
}

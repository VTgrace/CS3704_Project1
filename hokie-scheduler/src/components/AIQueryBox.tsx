import { ArrowUpRight, LoaderCircle, Sparkles } from "lucide-react";
import { prompts } from "../data/mockData";
export function AIQueryBox({
  query,
  onQuery,
  onSubmit,
  loading,
  message,
}: {
  query: string;
  onQuery: (q: string) => void;
  onSubmit: () => void;
  loading: boolean;
  message: string;
}) {
  return (
    <section className="panel ai-query">
      <div className="ai-heading">
        <Sparkles size={26} />
        <h2>How can I build your perfect schedule?</h2>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="query-input">
          <input
            aria-label="Ask for course recommendations"
            placeholder="I want an easy CS elective that fits around these classes"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
          <button
            className="primary send-button"
            aria-label="Find courses"
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <LoaderCircle className="spin" size={22} />
            ) : (
              <ArrowUpRight size={24} />
            )}
          </button>
        </div>
        <div className="handwritten query-note">
          Same Hokie energy.
          <br />
          Higher possibilities.
          <svg viewBox="0 0 100 12">
            <path
              d="M5 10Q40 0 95 3M20 11 83 5"
              fill="none"
              stroke="currentColor"
            />
          </svg>
        </div>
      </form>
      <div className="prompt-examples">
        <span>Try examples:</span>
        {prompts.map((prompt) => (
          <button key={prompt} onClick={() => onQuery(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <p
        className={`query-status ${message || loading ? "visible" : ""}`}
        role="status"
      >
        {loading ? "Finding a little more balance in your week…" : message}
      </p>
    </section>
  );
}

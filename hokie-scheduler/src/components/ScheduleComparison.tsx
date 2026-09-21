import { Check, Trophy } from "lucide-react";
import { options } from "../data/mockData";
import type { ScheduleOption } from "../types";
export function ScheduleComparison({
  selected,
  onSelect,
  onDetails,
}: {
  selected: ScheduleOption | null;
  onSelect: (option: ScheduleOption) => void;
  onDetails?: () => void;
}) {
  return (
    <section className="comparison">
      <div className="section-heading">
        <h2>Compare Schedule Options</h2>
        {onDetails && (
          <button className="text-button" onClick={onDetails}>
            View Details
          </button>
        )}
      </div>
      <div className="option-grid">
        {options.map((option) => (
          <article
            key={option.id}
            className={`option-card ${option.id === "best" ? "best" : ""} ${selected === option.id ? "selected" : ""}`}
          >
            <div className="option-title">
              <h3>{option.title}</h3>
              {option.id === "best" && <Trophy size={17} />}
            </div>
            <p>{option.subtitle}</p>
            <strong className="option-credits">{option.credits} credits</strong>
            <ul>
              <li>
                <Check />
                {option.classes} classes
              </li>
              <li>
                <Check />
                {option.benefit}
              </li>
            </ul>
            <button
              className={option.id === "best" ? "primary" : "secondary"}
              onClick={() => onSelect(option.id)}
            >
              {selected === option.id ? "Viewing Schedule" : "View Schedule"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

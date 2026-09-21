import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { ScheduleEvent, View } from "../types";
import { dateKey, formatTime, occursOn } from "../services/scheduler";
export function CalendarEvent({
  event,
  onClick,
  compact = false,
}: {
  event: ScheduleEvent;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      className={`calendar-event ${event.color} ${compact ? "compact" : ""}`}
      onClick={onClick}
      title={`${event.title} · ${formatTime(event.start)} – ${formatTime(event.end)} · ${event.location}`}
      style={
        compact
          ? undefined
          : {
              top: `${((event.start - 480) / 720) * 100}%`,
              height: `${((event.end - event.start) / 720) * 100}%`,
            }
      }
    >
      <strong>{event.title}</strong>
      {!compact && (
        <>
          <span>
            {formatTime(event.start)} – {formatTime(event.end)}
          </span>
          <span>{event.location}</span>
        </>
      )}
    </button>
  );
}
export function ScheduleCalendar({
  events,
  view,
  onView,
  date,
  onDate,
  semester,
  onAdd,
  onEvent,
}: {
  events: ScheduleEvent[];
  view: View;
  onView: (view: View) => void;
  date: Date;
  onDate: (date: Date) => void;
  semester: string;
  onAdd: () => void;
  onEvent: (event: ScheduleEvent) => void;
}) {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const dates = Array.from({ length: view === "Day" ? 1 : 5 }, (_, i) => {
    const d = new Date(view === "Day" ? date : monday);
    d.setDate(d.getDate() + (view === "Day" ? 0 : i));
    return d;
  });
  const navigate = (direction: number) => {
    const d = new Date(date);
    if (view === "Month") {
      d.setDate(1);
      d.setMonth(d.getMonth() + direction);
    } else d.setDate(d.getDate() + direction * (view === "Week" ? 7 : 1));
    onDate(d);
  };
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - ((monthStart.getDay() + 6) % 7));
  const monthDates = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <section className="panel schedule">
      <div className="calendar-toolbar">
        <div>
          <h2>My Schedule</h2>
          <p>
            {semester} <span>•</span>{" "}
            {view === "Week" ? "Weekly" : view === "Day" ? "Daily" : "Monthly"}{" "}
            View
          </p>
        </div>
        <div className="calendar-controls">
          <div className="date-arrows">
            <button
              className="icon-button"
              aria-label={`Previous ${view.toLowerCase()}`}
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="icon-button"
              aria-label={`Next ${view.toLowerCase()}`}
              onClick={() => navigate(1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="view-switcher" aria-label="Calendar view">
            {(["Day", "Week", "Month"] as const).map((v) => (
              <button
                key={v}
                aria-pressed={v === view}
                className={v === view ? "primary" : "secondary"}
                onClick={() => onView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="primary add-event-button" onClick={onAdd}>
            <Plus size={19} />
            Add Event
          </button>
        </div>
      </div>
      {view === "Month" ? (
        <>
          <p className="month-label">
            {date.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="month-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div className="month-weekday" key={d}>
                {d}
              </div>
            ))}
            {monthDates.map((d) => (
              <div
                key={dateKey(d)}
                className={`month-cell ${d.getMonth() !== date.getMonth() ? "other-month" : ""}`}
              >
                <button
                  className="month-date"
                  aria-label={`Show ${d.toDateString()}`}
                  onClick={() => {
                    onDate(d);
                    onView("Day");
                  }}
                >
                  {d.getDate()}
                </button>
                {events
                  .filter((e) => occursOn(e, d))
                  .map((e) => (
                    <CalendarEvent
                      key={e.id}
                      event={e}
                      compact
                      onClick={() => onEvent(e)}
                    />
                  ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="calendar-scroll">
          <div className={`time-calendar ${view === "Day" ? "day-view" : ""}`}>
            <div
              className="calendar-day-headers"
              style={{
                gridTemplateColumns: `62px repeat(${dates.length},1fr)`,
              }}
            >
              <div />
              {dates.map((d) => (
                <div key={dateKey(d)}>
                  <strong>
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </strong>
                  <span>
                    {d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
            <div
              className="time-grid"
              style={{
                gridTemplateColumns: `62px repeat(${dates.length},1fr)`,
              }}
            >
              <div className="time-labels">
                {Array.from({ length: 13 }, (_, i) => (
                  <span key={i} style={{ top: `${(i / 12) * 100}%` }}>
                    {formatTime((i + 8) * 60)}
                  </span>
                ))}
              </div>
              {dates.map((d) => (
                <div className="day-column" key={dateKey(d)}>
                  {events
                    .filter((e) => occursOn(e, d))
                    .map((e) => (
                      <CalendarEvent
                        key={e.id}
                        event={e}
                        onClick={() => onEvent(e)}
                      />
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

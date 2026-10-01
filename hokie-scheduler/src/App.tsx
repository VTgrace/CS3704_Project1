import { ChatHistory } from "./components/ChatHistory";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Search, SlidersHorizontal } from "lucide-react";
import { Header } from "./components/Header";
import { FilterSidebar } from "./components/FilterSidebar";
import { AIQueryBox } from "./components/AIQueryBox";
import { ScheduleCalendar } from "./components/ScheduleCalendar";
import { AddEventModal } from "./components/AddEventModal";
import {
  AIReasoningCard,
  CourseCard,
  CourseDetailsModal,
  RecommendedCourses,
} from "./components/RecommendedCourses";
import { ScheduleComparison } from "./components/ScheduleComparison";
import { Modal } from "./components/Modal";
import {
  baseEvents,
  courses,
  defaultFilters,
  options,
  personalEvents,
} from "./data/mockData";
import {
  conflicts,
  filterCourses,
  formatTime,
  meetingDays,
  recommendCourses,
} from "./services/scheduler";
import type {
  Course,
  ChatTurn,
  Filters,
  Page,
  ScheduleEvent,
  ScheduleOption,
  View,
} from "./types";
export default function App() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [dark, setDark] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [drawer, setDrawer] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const requestVersion = useRef(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<Course[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([
    ...baseEvents,
    ...personalEvents,
  ]);
  const [view, setView] = useState<View>("Week");
  const [date, setDate] = useState(new Date(2026, 7, 24));
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(
    null,
  );
  const [selectedOption, setSelectedOption] = useState<ScheduleOption | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState<Course | undefined>();
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const available = useMemo(
    () =>
      filterCourses(results, filters)
        .filter((c) => !events.some((e) => e.courseId === c.id))
        .map((c) => ({
          ...c,
          tags: c.tags.map((tag) =>
            (tag === "Fits Schedule" || tag === "No time overlap") &&
            events.some((e) => conflicts(e, c.meeting))
              ? "Time Conflict"
              : tag,
          ),
        })),
    [results, filters, events],
  );
  const catalog = filterCourses(results, filters).filter((c) =>
    `${c.id} ${c.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const changeFilter = (key: keyof Filters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    requestVersion.current++;
    setResults([]);
    setReason(undefined);
    setMessage("");
    if (key === "semester") {
      setDate(
        value === "Spring 2027" ? new Date(2027, 0, 18) : new Date(2026, 7, 24),
      );
      setToast(
        "Term changed. Submit your request to retrieve sections for this term.",
      );
    }
  };
  const reset = () => {
    setFilters(defaultFilters);
    requestVersion.current++;
    setResults([]);
    setReason(undefined);
    setMessage("");
    setDate(new Date(2026, 7, 24));
  };
  const submit = async () => {
    if (!query.trim() || loading) return;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await recommendCourses({
        prompt: query,
        filters,
        events,
        history: turns.slice(-4).flatMap((turn) => [
          { role: "user" as const, content: turn.prompt },
          { role: "assistant" as const, content: turn.response.explanation },
        ]),
      });
      if (version !== requestVersion.current) return;
      setTurns((previous) => [
        ...previous.slice(-3),
        { prompt: query, response },
      ]);
      setResults(response.courses);
      setReason(response.courses[0]);
      setMessage(response.explanation);
    } catch (error) {
      if (version !== requestVersion.current) return;
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not reach the backend. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const selectCourse = (course: Course) => {
    setSelectedCourse(course);
    setReason(course);
  };
  const addCourse = (course: Course) => {
    if (course.scheduleVerified === false) {
      setToast(
        "Meeting times are unverified; check the official timetable first.",
      );
      return;
    }
    if (
      events.some(
        (e) => e.courseId === course.id || conflicts(e, course.meeting),
      )
    ) {
      setToast("That section is already added or overlaps with an event.");
      return;
    }
    requestVersion.current++;
    setEvents((previous) => [...previous, course.meeting]);
    setSelectedOption(null);
    setSelectedCourse(null);
    setToast(`${course.id} added to your schedule`);
  };
  const chooseOption = (id: ScheduleOption) => {
    const option = options.find((o) => o.id === id)!;
    const extra = courses.find((c) => c.id === option.courseId);
    const personal = events.filter((e) => !e.courseId);
    const proposed = extra ? [...baseEvents, extra.meeting] : baseEvents;
    const conflict = proposed.find((c) =>
      personal.some((e) => conflicts(c, e)),
    );
    if (conflict) {
      setToast(
        `${option.title} overlaps with a personal event. Your schedule was kept.`,
      );
      return;
    }
    requestVersion.current++;
    setEvents([...proposed, ...personal]);
    setSelectedOption(id);
    setReason(undefined);
    setToast(`${option.title} is now on your calendar. Personal events kept.`);
    setPage("Dashboard");
  };
  const saveEvent = (event: ScheduleEvent) => {
    requestVersion.current++;
    setEvents((previous) => [...previous, event]);
    setDate(new Date(event.date + "T12:00:00"));
    if (event.days[0] === 0 || event.days[0] === 6) setView("Day");
    setAddOpen(false);
    setToast("Personal event added to your calendar");
  };
  return (
    <>
      <Header
        page={page}
        onPage={setPage}
        dark={dark}
        onTheme={() => setDark(!dark)}
      />
      <main
        className={`app-layout ${page !== "Dashboard" ? "alternate-page" : ""}`}
      >
        <button
          className="mobile-filter-button secondary"
          onClick={() => setDrawer(true)}
        >
          <SlidersHorizontal size={17} />
          Filters
        </button>
        <FilterSidebar
          filters={filters}
          onChange={changeFilter}
          onReset={reset}
          open={drawer}
          onClose={() => setDrawer(false)}
        />
        <div className="main-column">
          <AIQueryBox
            query={query}
            onQuery={setQuery}
            onSubmit={submit}
            loading={loading}
            message={message}
          />
          <ChatHistory turns={turns} />
          {page === "Explore Courses" ? (
            <section className="panel explore">
              <div className="section-heading">
                <div>
                  <h2>Explore Courses</h2>
                  <p className="muted">
                    A little curiosity. A lot of possibilities.
                  </p>
                </div>
                <BookOpen className="maroon" />
              </div>
              <label className="catalog-search">
                <Search size={18} />
                <input
                  aria-label="Search course catalog"
                  placeholder="Search by name or course number"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <p className="muted catalog-count">
                {catalog.length} retrieved courses · {filters.semester}
              </p>
              <div className="catalog-grid">
                {catalog.map((c) => (
                  <CourseCard
                    course={c}
                    key={c.id}
                    onClick={() => selectCourse(c)}
                  />
                ))}
              </div>
              {!catalog.length && (
                <div className="empty-state">
                  No courses match. Try another search or reset your filters.
                </div>
              )}
              <p className="demo-disclaimer">
                Submit a scheduling request to retrieve courses and their
                sources. Ratings appear only when matching review evidence is
                available.
              </p>
            </section>
          ) : page === "Compare Schedules" ? (
            <section className="panel comparison-page">
              <h2>Find your kind of balance</h2>
              <p className="muted">
                Compare three starting points. Your personal commitments stay
                with you.
              </p>
              <ScheduleComparison
                selected={selectedOption}
                onSelect={chooseOption}
              />
              <table>
                <caption>Sample schedule breakdown</caption>
                <thead>
                  <tr>
                    <th>Course</th>
                    {options.map((o) => (
                      <th key={o.id}>{o.title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...baseEvents.map((e) => e.title),
                    "ARTH 1054",
                    "CS 3724",
                  ].map((title) => (
                    <tr key={title}>
                      <th>{title}</th>
                      {options.map((o) => (
                        <td key={o.id}>
                          {baseEvents.some((e) => e.title === title) ||
                          o.courseId === title ? (
                            <Check size={17} aria-label="Included" />
                          ) : (
                            "—"
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="demo-disclaimer">
                Credit totals use a 12-credit sample base. “Free afternoons”
                describes class time only; personal events are preserved and
                checked before switching.
              </p>
            </section>
          ) : (
            <ScheduleCalendar
              events={events}
              view={view}
              onView={setView}
              date={date}
              onDate={setDate}
              semester={filters.semester}
              onAdd={() => setAddOpen(true)}
              onEvent={setSelectedEvent}
            />
          )}
        </div>
        <aside className="right-column">
          <RecommendedCourses
            courses={available}
            onSelect={selectCourse}
            onViewAll={() => setPage("Explore Courses")}
            loading={loading}
          />
          <section className="panel compare-panel">
            <ScheduleComparison
              selected={selectedOption}
              onSelect={chooseOption}
              onDetails={() => setPage("Compare Schedules")}
            />
            <AIReasoningCard course={reason} />
          </section>
          <p className="sidebar-footnote">
            <span />
            Calendar starts with demo events. Course recommendations use
            retrieved sources.
          </p>
        </aside>
      </main>
      {addOpen && (
        <AddEventModal
          date={date}
          onClose={() => setAddOpen(false)}
          onSave={saveEvent}
        />
      )}
      {selectedCourse && (
        <CourseDetailsModal
          course={selectedCourse}
          events={events}
          onClose={() => setSelectedCourse(null)}
          onAdd={addCourse}
        />
      )}{" "}
      {selectedEvent && (
        <Modal
          title={selectedEvent.title}
          onClose={() => setSelectedEvent(null)}
        >
          <dl className="detail-grid">
            <div>
              <dt>When</dt>
              <dd>{selectedEvent.date ?? meetingDays(selectedEvent.days)}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {formatTime(selectedEvent.start)} –{" "}
                {formatTime(selectedEvent.end)}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{selectedEvent.location || "No location set"}</dd>
            </div>
            {selectedEvent.notes && (
              <div>
                <dt>Notes</dt>
                <dd>{selectedEvent.notes}</dd>
              </div>
            )}
          </dl>
          <div className="modal-footer">
            <button
              className="secondary"
              onClick={() => setSelectedEvent(null)}
            >
              Close
            </button>
            <button
              className="primary"
              onClick={() => {
                setEvents(events.filter((e) => e.id !== selectedEvent.id));
                setSelectedEvent(null);
                setSelectedOption(null);
                setToast("Event removed");
              }}
            >
              Remove from schedule
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </>
  );
}

import { SourceCitations } from "./SourceCitations";
import {
  ArrowRight,
  BookOpen,
  FileText,
  GraduationCap,
  Lightbulb,
  Star,
} from "lucide-react";
import type { Course, ScheduleEvent } from "../types";
import { conflicts, formatTime, meetingDays } from "../services/scheduler";
import { Modal } from "./Modal";
export function CourseCard({
  course,
  onClick,
}: {
  course: Course;
  onClick: () => void;
}) {
  const Icon = course.id.startsWith("CS")
    ? BookOpen
    : course.id.startsWith("ARTH")
      ? GraduationCap
      : FileText;
  return (
    <button className={`course-card ${course.color}`} onClick={onClick}>
      <span className="course-icon">
        <Icon size={22} />
      </span>
      <span className="course-card-body">
        <span className="course-title-row">
          <strong>
            {course.id === "ARTH 1054" || course.id === "ENGL 3764"
              ? course.name
              : course.id}
          </strong>
          <small>{course.credits} credits</small>
        </span>
        <span className="course-subtitle">
          {course.id === "ARTH 1054" || course.id === "ENGL 3764"
            ? course.id
            : course.name}
        </span>
        <span className="tags">
          {course.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </span>
      </span>
      <ArrowRight className="course-arrow" size={17} />
    </button>
  );
}
export function RecommendedCourses({
  courses,
  onSelect,
  onViewAll,
  loading,
}: {
  courses: Course[];
  onSelect: (c: Course) => void;
  onViewAll: () => void;
  loading: boolean;
}) {
  return (
    <section className="panel recommendations">
      <div className="section-heading">
        <h2>AI Recommended Courses</h2>
        <button className="text-button" onClick={onViewAll}>
          View All
        </button>
      </div>
      <div className={loading ? "course-list loading" : "course-list"}>
        {courses.slice(0, 3).map((course) => (
          <CourseCard
            course={course}
            key={course.id}
            onClick={() => onSelect(course)}
          />
        ))}
      </div>
      {!courses.length && (
        <div className="empty-state">
          <BookOpen size={28} />
          <strong>No matches just yet</strong>
          <p>Try adjusting your filters or asking for something broader.</p>
        </div>
      )}
    </section>
  );
}
export function AIReasoningCard({ course }: { course: Course | undefined }) {
  return (
    <div className="reasoning">
      <Lightbulb size={27} />
      <div>
        <h3>Why this course?</h3>
        <p>
          {course?.reason ??
            "Tell us what matters to you. We’ll look for sourced courses that work with your preferences and commitments."}
        </p>
        <SourceCitations citations={course?.citations ?? []} />
      </div>
    </div>
  );
}
export function CourseDetailsModal({
  course,
  events,
  onClose,
  onAdd,
}: {
  course: Course;
  events: ScheduleEvent[];
  onClose: () => void;
  onAdd: (course: Course) => void;
}) {
  const unverified = course.scheduleVerified === false;
  const added = events.some((e) => e.courseId === course.id);
  const conflict = events.find((e) => conflicts(e, course.meeting));
  return (
    <Modal title={course.id} onClose={onClose}>
      <h3 className="course-detail-title">{course.name}</h3>
      <div className="tags detail-tags">
        {course.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <dl className="detail-grid">
        <div>
          <dt>Credits</dt>
          <dd>{course.credits} credits</dd>
        </div>
        <div>
          <dt>Meeting days</dt>
          <dd>{meetingDays(course.meeting.days)}</dd>
        </div>
        <div>
          <dt>Meeting time</dt>
          <dd>
            {formatTime(course.meeting.start)} –{" "}
            {formatTime(course.meeting.end)}
          </dd>
        </div>
        <div>
          <dt>Location / modality</dt>
          <dd>
            {course.meeting.location} · {course.modality}
          </dd>
        </div>
        <div>
          <dt>Professor</dt>
          <dd>{course.professor}</dd>
        </div>
        <div>
          <dt>Student review rating</dt>
          <dd>
            <Star size={15} className="star" />{" "}
            {course.rating === null
              ? "Not enough evidence"
              : `${course.rating} / 5`}
          </dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>{course.difficulty}</dd>
        </div>
        <div>
          <dt>Estimated workload</dt>
          <dd>{course.workload}</dd>
        </div>
      </dl>
      <AIReasoningCard course={course} />
      <p className="demo-disclaimer">
        {course.citations?.length
          ? "Check cited section details, prerequisites, and available seats before enrolling."
          : "These are illustrative demo sections."}
      </p>
      {conflict && !added && (
        <p className="form-error" role="status">
          This section overlaps with {conflict.title}. Choose another course or
          schedule.
        </p>
      )}
      {course.sectionId && (
        <p className="demo-disclaimer">
          CRN {course.sectionId} · {course.semester}
        </p>
      )}
      {course.restrictions && (
        <p className="evidence-notes">
          <strong>Section restrictions:</strong> {course.restrictions}
        </p>
      )}
      <SourceCitations citations={course.citations ?? []} />
      <div className="modal-footer">
        <button className="secondary" onClick={onClose}>
          Close
        </button>
        <button
          className="primary"
          disabled={added || !!conflict || unverified}
          onClick={() => onAdd(course)}
        >
          {unverified
            ? "Meeting times unverified"
            : added
              ? "Already in your schedule"
              : conflict
                ? "Schedule conflict"
                : "Add to Schedule"}
        </button>
      </div>
    </Modal>
  );
}

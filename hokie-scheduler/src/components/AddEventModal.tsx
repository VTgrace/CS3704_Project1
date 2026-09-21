import { useState } from "react";
import { Modal } from "./Modal";
import type { ScheduleEvent } from "../types";
import { dateKey } from "../services/scheduler";
export function AddEventModal({
  date,
  onClose,
  onSave,
}: {
  date: Date;
  onClose: () => void;
  onSave: (event: ScheduleEvent) => void;
}) {
  const [error, setError] = useState("");
  return (
    <Modal title="Make room for your life" onClose={onClose}>
      <p className="muted modal-intro">
        Classes are only part of your week. Add the things that matter.
      </p>
      <form
        className="event-form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const time = (key: string) => {
            const [h, m] = String(data.get(key)).split(":").map(Number);
            return h * 60 + m;
          };
          const start = time("start"),
            end = time("end");
          if (end <= start) {
            setError("End time must be after start time.");
            return;
          }
          if (start < 480 || end > 1200) {
            setError(
              "For this prototype, choose a time between 8:00 AM and 8:00 PM.",
            );
            return;
          }
          const chosen = String(data.get("date"));
          onSave({
            id: crypto.randomUUID(),
            title: String(data.get("name")).trim(),
            date: chosen,
            days: [new Date(chosen + "T12:00:00").getDay()],
            start,
            end,
            location: String(data.get("location")).trim(),
            notes: String(data.get("notes")).trim(),
            color: "green",
          });
        }}
      >
        <label>
          Event name
          <input
            name="name"
            required
            maxLength={60}
            placeholder="Study session, work, coffee with friends…"
            autoFocus
          />
        </label>
        <label>
          Date
          <input
            type="date"
            name="date"
            defaultValue={dateKey(date)}
            required
          />
        </label>
        <div className="form-row">
          <label>
            Start time
            <input type="time" name="start" defaultValue="15:00" required />
          </label>
          <label>
            End time
            <input type="time" name="end" defaultValue="16:00" required />
          </label>
        </div>
        <label>
          Location
          <input
            name="location"
            placeholder="Where will you be?"
            maxLength={100}
          />
        </label>
        <label>
          Notes <span className="muted">(optional)</span>
          <textarea
            name="notes"
            placeholder="Anything else to remember"
            maxLength={500}
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary">Save event</button>
        </div>
      </form>
    </Modal>
  );
}

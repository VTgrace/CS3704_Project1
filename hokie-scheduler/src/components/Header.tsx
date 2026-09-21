import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  Home,
  Moon,
  Sun,
} from "lucide-react";
import { useState } from "react";
import type { Page } from "../types";
export function Header({
  page,
  onPage,
  dark,
  onTheme,
}: {
  page: Page;
  onPage: (page: Page) => void;
  dark: boolean;
  onTheme: () => void;
}) {
  const [profile, setProfile] = useState(false);
  return (
    <header className="app-header">
      <a
        className="brand"
        href="#dashboard"
        onClick={() => onPage("Dashboard")}
      >
        <svg className="brand-mark" viewBox="0 0 64 48" aria-hidden="true">
          <path fill="currentColor" d="M3 42 20 10l9 17L40 2l21 40Z" />
          <path fill="#ed8a37" d="m4 42 12-23 6 10-7 13Z" />
          <path fill="white" d="m35 20 5-9 5 9-5-3Z" />
          <path fill="#ad3863" d="m34 42 12-27 13 27Z" />
        </svg>
        <span>
          <strong>Hokie Scheduler</strong>
          <small>Smart schedule builder for Virginia Tech students</small>
        </span>
      </a>
      <nav aria-label="Main navigation">
        {(
          [
            { title: "Dashboard", icon: Home },
            { title: "Explore Courses", icon: BookOpen },
            { title: "Compare Schedules", icon: ChartNoAxesColumnIncreasing },
          ] as const
        ).map(({ title, icon: Icon }) => (
          <button
            key={title}
            className={page === title ? "nav-active" : ""}
            onClick={() => onPage(title)}
          >
            <Icon size={19} />
            <span>{title}</span>
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <button
          className="theme-button"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={onTheme}
        >
          {dark ? <Moon size={23} /> : <Sun size={25} />}
          <span className={`toggle ${dark ? "on" : ""}`}>
            <i />
          </span>
        </button>
        <div className="profile-wrap">
          <button
            className="profile-button"
            aria-label="Open profile"
            aria-expanded={profile}
            onClick={() => setProfile(!profile)}
          >
            <span className="avatar">AS</span>
            <ChevronDown size={16} />
          </button>
          {profile && (
            <div className="profile-menu">
              <strong>Ayesha</strong>
              <span>Virginia Tech student</span>
              <small>Demo profile · local session</small>
            </div>
          )}
        </div>
        <span className="handwritten header-note">
          Better schedules.
          <br />
          Brighter tomorrows.
        </span>
      </div>
    </header>
  );
}

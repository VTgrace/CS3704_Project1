# Hokie Scheduler

A responsive frontend prototype for Virginia Tech course planning, built with React, TypeScript, Vite, Tailwind CSS, and Lucide icons. The dashboard follows the supplied screenshot with maroon accents, pastel course blocks, and a three-column desktop layout.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run build` checks TypeScript and creates `dist/`; `npm run preview` serves that build. `npm test` runs scheduling logic tests.

## Files and structure

- `src/App.tsx`: shared application state, navigation, filters, scheduling actions, and feedback.
- `src/components/Header.tsx`: navigation, theme toggle, and demo profile.
- `src/components/FilterSidebar.tsx`: filters and the mobile drawer.
- `src/components/AIQueryBox.tsx`: prompt entry, examples, and processing feedback.
- `src/components/ScheduleCalendar.tsx`: day/week/month views, calendar navigation, and event blocks.
- `src/components/Modal.tsx`, `AddEventModal.tsx`: accessible native dialogs and personal-event form.
- `src/components/RecommendedCourses.tsx`: recommendation cards, details dialog, and course reasoning.
- `src/components/ScheduleComparison.tsx`: three selectable sample schedules.
- `src/data/mockData.ts`: courses, recurring classes, personal commitments, filters, and comparison presets.
- `src/types/index.ts`: shared event, course, filter, and recommendation contracts.
- `src/services/scheduler.ts`: filter matching, dates, conflict detection, formatting, and asynchronous mock recommendation adapter.
- `src/services/scheduler.test.ts`: regression checks for conflict boundaries, dated events, filtering, and recommendations.
- `src/styles.css`: screenshot-inspired layout, styling, dark mode, and responsive breakpoints; imports Tailwind CSS.
- `vite.config.js`, `tsconfig.json`, `package.json`, `index.html`, and `public/favicon.svg`: application setup and custom geometric mark.

## Demo behavior

Use prompt chips or enter a request; click the arrow to simulate recommendations. Supported example intents include easy courses, CS electives, gen ed, Friday meetings, and three-credit courses. All seven filters are controlled; semester switches the displayed sample term. No-match states are explicit.

Course details include mock meeting information, professor rating, workload, and reasoning. Adding courses checks overlaps and duplicate enrollment. Personal events are dated and support weekends through Day view. Existing class and personal blocks repeat weekly. Comparison presets replace classes while preserving personal events and refuse conflicting presets. Click calendar events to inspect or remove them.

## Backend and source-backed recommendations

The chat now calls a local Express API. Run `npm run setup` to create private configuration, `npm run doctor` to check integrations, and `npm run dev` to start both frontend and backend. Official VT timetable retrieval works without a key; optional LLM, Reddit, and permitted professor-review data are configured server-side in `.env`. See [Backend setup and source status](server/README.md).

## Original frontend demo notes

The prototype is integrated into the existing `hokie-scheduler` React/Vite application. Existing React and Vite dependency ranges are preserved, with TypeScript, Tailwind, and scheduling components added.

`recommendCourses(request)` calls `/api/recommendations`. Course and schedule contracts are kept separate from visual components for eventual catalog/LLM integration. The backend adds VT retrieval, citations, conflict checks, and optional LLM/Reddit adapters; there is no authentication or database.

Initial calendar events and comparison presets are illustrative. Chat recommendations come from retrieved sources; unknown ratings and workload remain unknown. Comparison totals follow the requested 12/15-credit demo presets, not a live catalog audit. Free afternoons refer to classes only. State is held in memory and resets on reload. Personal events may overlap; recommended course additions and comparison changes check commitments. Personal event entry is limited to 8 AM–8 PM. The backend uses deterministic matches when LLM credentials are absent.

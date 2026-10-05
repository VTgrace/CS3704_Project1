# Hokie Scheduler backend

Authors: Ayesha Saiyed, Jannie Torrico, Grace Marrone.

An Express/TypeScript API retrieves official VT course sections, excludes calendar conflicts, and optionally asks an LLM to rank eligible courses using retrieved evidence. Citations are server-owned URLs with source names, course associations, retrieval timestamps, and excerpts. It does not invent ratings or silently substitute mock courses when a source fails.

## Run locally

From `hokie-scheduler`:

```sh
npm ci
npm run setup
npm run dev
```

`npm run dev` starts Vite and the API together. Vite prints the frontend URL (normally port 5173) and proxies `/api` to `127.0.0.1:3001`. If changing `PORT`, update the Vite proxy as well. Node 22.12+ or Node 24 is recommended. `npm run build` type-checks frontend and backend; `npm test` runs deterministic tests; `npm run lint` runs the existing linter. `npm run start:server` starts the API without watch mode. `npm run preview` serves the built frontend and also proxies `/api`; start the API separately for preview.

No API key is required for real VT timetable matches. Without LLM configuration, the response explicitly uses `mode: "retrieval"` and tells students that AI was not used.

## LLM configuration

Set these only in the local, gitignored `.env`:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_MODEL=your-enabled-model-id
```

Choose a model enabled for your OpenAI API account that supports the Responses API and structured outputs. Model choice is explicit rather than hardcoded. Never put secrets in `VITE_*` variables or browser code. No key is stored or returned by the API.

The model receives the current prompt, dropdown filters, up to eight prior user/assistant messages, eligible candidate metadata, source excerpts, and busy time ranges. Event titles, locations from personal events, and notes are not sent to the LLM. User chat text is sent as written, so avoid putting personal information in it. Responses use `store: false`; normal provider data-handling policies still apply. The app does not persist chat or schedule data server-side.

LLM output is parsed against a schema, then checked against actual candidate IDs, CRNs, and allowed citation IDs. Unknown references, output failures, and timeouts fall back to labeled retrieval matches. Valid citation IDs do not mathematically guarantee the model interpreted evidence correctly; the UI exposes original excerpts for review. Deterministic schedule filters run before the LLM and cannot be overridden by its response.

## Source integrations

### Virginia Tech timetable — live

- Reads available terms from `https://selfservice.banner.vt.edu/ssb/HZSKVTSC.P_DispRequest`.
- Submits the public timetable search form to `HZSKVTSC.P_ProcRequest` for up to three supported subjects per request.
- Parses CRN, course number, name, credits, instructor, modality, weekdays, time, location, and section restrictions.
- Links each citation directly to that CRN's official section detail page.
- Five-minute process-local cache, deduplicated in-flight requests, bounded downloads, and 12-second network timeouts.
- Unknown times, non-lecture sections, and detected multi-meeting continuations are excluded from schedule-fit recommendations. Catalog-only data never establishes a meeting time.
- Published term availability is checked; an unpublished Spring 2027 request will not silently return Fall 2026 sections.
- This is a parser of the current HTML page, not an official VT API contract. Upstream layout changes fail closed. Seat status, prerequisite completion, linked lab selection, degree audit, Pathways credit, and enrollment eligibility are not verified. The UI explicitly states those limits.

### Virginia Tech catalog — adapter implemented, live endpoint currently unavailable

`providers/vt.ts` also retrieves CourseLeaf subject pages from `https://catalog.vt.edu/undergraduate/course-descriptions/` and parses course descriptions. These augment timetable evidence when available. During implementation the endpoint returned HTTP 202 with no course content. The app reports `vt-catalog: unavailable`; timetable data remains separately cited. The parser is fixture-tested but live catalog parsing could not be verified. No access challenge is bypassed and no archived descriptions are mislabeled as current.

### Reddit — OAuth API adapter, configuration required

Set `REDDIT_ACCESS_TOKEN` to a current read-scope token issued for approved Data API access and set `REDDIT_USER_AGENT` to your application's descriptive user agent. The adapter searches `r/VirginiaTech` for up to three candidate course numbers, retains exact course mentions in post titles/body text, and cites individual posts. It does not infer numeric professor ratings from posts or fetch comment trees. You can instead configure `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` for an approved confidential app, plus optional `REDDIT_REFRESH_TOKEN` for user OAuth. Tokens issued through these modes are cached and renewed automatically. A manually supplied `REDDIT_ACCESS_TOKEN` takes priority and must be renewed manually. Expired tokens and upstream failures produce an unavailable status.

Apply for access under Reddit's current rules before configuring the adapter. Live retrieval was not tested because no credentials were supplied. Posts are anecdotal opinions, not official enrollment facts.

- https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki
- https://www.reddit.com/dev/api/

### Rate My Professors — permitted local import, no unauthorized scraper

Rate My Professors restricts automated scraping without permission. There is no claimed public API integration here. Set `RMP_IMPORT_FILE` to an absolute path containing a permitted/licensed export. Alternatively, set `RMP_FEED_URL` to an authorized provider’s HTTPS endpoint returning the same normalized JSON array; optional `RMP_FEED_TOKEN` is sent as a Bearer token only to that configured endpoint. This is an adapter contract, not a claim that Rate My Professors offers a public API. Keep the file outside Git or under ignored `server/data/`.

The import is a JSON array. Each item must contain:

| Field         | Type / meaning                                                      |
| ------------- | ------------------------------------------------------------------- |
| `courseId`    | Exact course ID, e.g. `CS 3724`                                     |
| `professor`   | Exact timetable instructor name; unmatched records are not attached |
| `rating`      | Number from 0 to 5, or `null`                                       |
| `difficulty`  | `Easy`, `Moderate`, `Hard`, or `Unknown`                            |
| `workload`    | Evidence-backed workload summary, or `Unknown`                      |
| `url`         | Real `https://www.ratemyprofessors.com/professor/<id>` source URL   |
| `excerpt`     | Supporting permitted text, maximum 1,000 characters                 |
| `retrievedAt` | ISO timestamp for the actual retrieval                              |

Records must match both course and professor, use a real professor URL, and be no more than 180 days old. Do not fill the import with invented reviews. Exact-name matching is deliberately conservative; many timetable sections list instructor `N/A`, in which case professor reviews cannot be safely joined. No record means null rating, unknown difficulty, and no unsupported “easy” claim.

- https://www.ratemyprofessors.com/terms-of-use

## API

`GET /api/health` returns liveness and configuration booleans (never credentials).

`POST /api/recommendations`:

```json
{
  "prompt": "Show me CS electives that fit my schedule",
  "filters": {
    "semester": "Fall 2026",
    "major": "Computer Science",
    "difficulty": "Any",
    "rating": "Any",
    "credits": "Any",
    "time": "No Preference",
    "modality": "Any"
  },
  "events": [],
  "history": []
}
```

The existing `ScheduleEvent` schema is accepted in `events`; date-specific events and recurring weekly meetings participate in conflict checks. `history` is optional and accepts up to eight `{ "role": "user" | "assistant", "content": "..." }` messages.

The response contains `courses`, `explanation`, `mode`, `sources`, and `warnings`. Each course carries its official `sectionId`, `semester`, `scheduleVerified` flag, restrictions, and citations. Source states are `ready`, `unavailable`, or `not-configured`.

Errors: malformed/invalid input 400, disallowed origin 403, oversized body 413, rate/concurrency limit 429, service error 503. Source-specific failures are surfaced inside successful responses so other evidence can still be used.

## Scope and extension points

- `contracts.ts`: request validation, provider interfaces.
- `providers/vt.ts`, `reddit.ts`, `reviews.ts`: independently replaceable evidence adapters.
- `providers/http.ts`: bounded network requests and cache.
- `recommend.ts`: retrieval, matching, conflicts, ranking, citation validation.
- `llm.ts`: optional OpenAI structured-output ranking adapter.
- `app.ts`, `index.ts`: local HTTP API and startup.
- `tests/backend.test.ts`: fixtures and API integration tests without live credentials.

The prototype searches a bounded subject set and returns at most three independent alternatives. It is not a complete degree audit, solver, or full catalog search. Subject grouping under a major is a discovery aid, not evidence of major/Pathways eligibility. Without an LLM, free text supports course keywords, CS upper-level candidates, credits, weekday exclusions, and explicit AM/PM bounds; unrestricted language is not fully understood. With an LLM, only retrieved candidates can be ranked.

The calendar still starts with labeled demo commitments; replace these with the student's real classes before relying on fit checks. Comparison presets remain demo schedules. Day/week/month views, personal events, filters, and theme toggle are unchanged. Chat and schedule state reset on reload. No accounts or database are implemented. The API binds to loopback and is for a local class demo: add authenticated sessions, persistent storage, deployment-specific origin rules, shared rate limiting, and proper secret management before public hosting.

## Setup checks

Run `npm run setup` once to create a private `.env` without overwriting existing credentials. Run `npm run doctor -- "Fall 2026"` to check each source and model access. It prints only status, never tokens. A nonzero exit indicates an unavailable/unconfigured integration, not necessarily a broken app. The OpenAI check lists model access without generating paid completion tokens; full inference still requires a funded API account.

If live catalog access remains unavailable, `VT_CATALOG_IMPORT_FILE` accepts a JSON array of dated official exports with fields `courseId`, `name`, `credits`, `description`, `url`, and `retrievedAt`. Only HTTPS `catalog.vt.edu/undergraduate/` URLs and snapshots younger than one year are accepted. Snapshot citations retain their actual retrieval date and are labeled as snapshots, never live. They add descriptions but cannot establish current semester meeting times.

OpenAI API usage is billed separately from ChatGPT. Reddit has free and paid access subject to its approval and use conditions. This project creates its own API; it cannot issue external service credentials or grant source access. Without these credentials, real VT timetable matching remains usable and source gaps are disclosed.

### No-key VT evidence and major resources

`GET /api/programs` retrieves VT Registrar's alphabetic **legacy** major/option directory, preserving the exact year labels and official PDF links. It is cached for 24 hours and fails closed if the source layout changes. The UI exposes it under Filters → Major roadmaps & requirements. Current and previous catalog links are separate; this directory is not asserted to be a complete current major list.

Students can record their own degree program and catalog year. These fields accompany recommendation requests and select matching reviewed rules where available. The app does **not** automatically parse checksheet PDFs or current roadmaps or infer required/elective status from a course merely appearing on a page. It checks only explicitly reviewed rules, as described below. The current catalog has returned a robot challenge during integration checks. No challenge bypass is implemented.

For CS searches, the backend also retrieves the public CS department course-information page. It uses explicitly listed course numbers and full names to improve text matching and adds `vt-department` citations. This is not a review source, a prerequisite solver, or proof of a degree requirement. Live timetable data remains necessary for section recommendations. Day exclusions, combined start/end bounds, and explicitly requested course numbers are enforced before ranking.

### Degree checker (partial rule coverage)

`GET /api/degree-plans` lists the exact program/year combinations and rule counts currently loaded. `POST /api/degree-audit` accepts `{ planId, catalogYear, attempts: [{ courseId: "CS 1114", grade: "A" }] }`. Mismatched years return 404; no nearest-year fallback occurs. Grades remain in the local backend and are not sent to OpenAI.

The initial reviewed dataset is **Computer Science, 2023–2024: 25 rules** from the CS department's six-page official checksheet, covering selected core courses/substitutions and five elective groups. It does not cover all majors/years or certify graduation. Credits, GPA, Pathways, general electives, transfer equivalencies, and policy exceptions remain manual. `P` and `T` entries require review, `IP` is in progress, and overlapping requirement allocations are flagged rather than double-counted. Recommendations gain year-specific requirement citations when a matching reviewed plan exists.

To extend any program/year, add an operator-reviewed JSON array conforming to `server/degree/schema.ts` and configure `VT_DEGREE_PLANS_FILE` with its path. Each rule must cite an official HTTPS VT document and page, and every plan declares its unimplemented checks. Review course alternatives, grades, year labels, and option/concentration against the complete document before importing. A URL allowlist validates provenance format, not correctness; the operator must review the rules. Duplicate plans and rule IDs fail validation. Never bulk promote automatically extracted PDF text into verified degree rules.

PDF links in the legacy directory are not parsed automatically.

### Gemini chatbot provider

The existing course recommendation chat can now use Google's Gemini GenerateContent API with structured JSON output. No browser key or extra SDK is required. In your private `hokie-scheduler/.env`, set:

```dotenv
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=your_available_text_model_id
```

Create a key in https://aistudio.google.com/apikey and choose a model available to that account with structured-output support. Restart `npm run dev` after changing `.env`. `npm run doctor` checks model access without generating content. `/api/health` reports the selected provider but never the key. Do not use a `VITE_` prefix for secrets.

`auto` prefers fully configured Gemini, then OpenAI. Explicit `gemini`/`openai` selections never switch providers on an error. Gemini receives the user's prompt/history, filters, anonymous busy times, and retrieved candidate evidence; personal event titles/notes and degree-checker grades are excluded. The chat still only recommends retrieved eligible courses, and existing server validation rejects invented course/section/citation IDs. Missing keys, blocked/truncated answers, timeouts and provider failures fall back to deterministic matches. This adds Gemini to course-recommendation chat, not an unrestricted general-purpose chatbot.

### Verified prototype behavior

The response includes `provider: "gemini"` or `"openai"` only when AI ranking succeeded. The chat shows that provider name next to the answer. Gemini retries a temporary 502/503/504 once within a shared 35-second deadline; quota, credential, connection and model-access failures have distinct user-facing messages. Errors never include raw provider response bodies. No automatic fallback to a different AI vendor occurs.

Common department names such as `psych`, `psychology`, `computer science` and compact codes such as `CS3724` select the intended subject. Explicit subject requests cannot fall back to unrelated departments. “Only on Friday” rejects sections that also meet on other days. An AI answer with no recommendations is described as insufficient matching evidence rather than a timetable outage.

Live integrations requiring unavailable credentials or inaccessible sources are skipped with status information. The prototype does not assert live Reddit/RMP access, complete catalog coverage, all-major degree audits, or verified seat/prerequisite eligibility. Comparison presets and initial calendar events remain demo data. Each teammate must configure their own private `.env`; keys are never included in the repository.

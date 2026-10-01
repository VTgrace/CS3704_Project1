# Hokie Scheduler

Hokie Schedule is an app designed to make class selection and scheduling easier. With information coming from word-of-mouth and online websites (ex: Rate-my-professor, Reddit), it can be difficult to decide what classes to take. 

# Dependencies
See hokie-scheduler/package.json

# Setup

1. Clone repository
2. Change directory into hokie-scheduler: `cd hokie-scheduler`
3. Install dependencies: `npm ci`
4. Create private configuration with `npm run setup`; configure optional service credentials in `.env`. Run `npm run doctor` to check integration availability.
5. Start frontend and backend: `npm run dev`
6. Navigate to: [http://localhost:5173/](http://localhost:5173/) (or the port printed by Vite).

# Authors
Ayesha Saiyed (ayesha0@vt.edu)  
Jannie Torrico (jannie@vt.edu)  
Grace Marrone (gracee@vt.edu)

## Backend

The source-backed recommendation API, integration setup, and current limitations are documented in [hokie-scheduler/server/README.md](hokie-scheduler/server/README.md).

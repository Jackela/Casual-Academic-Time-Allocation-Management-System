# Backend API Overview

The CATAMS backend exposes REST endpoints under `/api`. Key modules:

| Module | Endpoints | Notes |
|--------|-----------|-------|
| Timesheets | `/timesheets`, `/timesheets/{id}`, `/timesheets/quote`, `/timesheets/config`, `/timesheets/pending-final-approval` | Quote endpoint provides EA calculations; config endpoint is SSOT for UI validation; create/update re-run calculator. |
| Approvals | `/approvals` | Handles approval transitions (tutor submit, lecturer approve, admin finalise). |
| Auth | `/auth/login`, `/auth/refresh` | Issues JWT tokens and refresh flows. |
| Courses | `/courses` | Retrieves course metadata for tutors and lecturers. |

All endpoints require Bearer tokens except `/auth/login`. Controllers live under `com.usyd.catams.controller`.

See `docs/backend/api-timesheets.md` for detailed contract information about the Schedule 1 calculator endpoints.

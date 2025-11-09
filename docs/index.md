# CATAMS Documentation Hub

Welcome to the Enterprise Agreement compliant documentation set for the Casual Academic Time Allocation Management System (CATAMS).

## SSOT Map
- Product Requirements (SSOT): `docs/product/requirements/University-of-Sydney-Enterprise-Agreement-2023-2026.pdf` and searchable `docs/product/requirements/University-of-Sydney-Enterprise-Agreement-2023-2026.txt`
- API Contract (SSOT): `docs/openapi.yaml` (source). Bundle: `docs/openapi.bundled.yaml` (generated)
- Architecture (SSOT): `docs/architecture/overview.md` with ADRs under `docs/adr/`
- Backend Dev (SSOT): `docs/backend/development-guide.md`
- Frontend Architecture (SSOT): `docs/frontend/architecture.md`
- Testing (SSOT): `docs/testing/README.md` (see also `docs/testing/QUICK_START.md`, `docs/testing/strategy.md`)
- Ops/Runbooks (SSOT): `docs/ops/deployment-guide.md`, `docs/ops/runbooks.md`, `docs/ops/release-checklist.md`
- Policy & Compliance (SSOT): `docs/policy/timesheet-ssot.md`, `docs/policy/backend-ssot.md`

## How to Use These Docs
- **Developers** ? start with `docs/backend/development-guide.md`, `docs/backend/api-overview.md`, and the data model notes.
- **Product & UX** ? review `docs/product/user-guide.md`, `docs/frontend/ux-spec.md`, and release notes.
- **Operations** ? follow `docs/ops/deployment-guide.md`, `docs/ops/runbooks.md`, and `docs/ops/release-checklist.md`.
- **Quality & Testing** ? see `docs/testing/strategy.md` plus the Playwright guides under `docs/frontend/testing.md`.

## EA Compliance Quick Links
- `docs/policy/ea-schedule1-overview.md`
- `docs/policy/backend-ssot.md`
- `docs/backend/api-timesheets.md`
- `docs/backend/data-model.md`

## Latest Updates
- Schedule 1 calculator and policy data migrated to the backend SSOT.
- Timesheet quote endpoint and UI refactor complete; `/api/timesheets/config` now publishes the authoritative constraints (hours range, Monday guard, currency).
- Tutor-course assignment enforcement now guards lecturer approvals (403) and drives frontend filtering.
- Documentation reorganised to this structure (Phase 0). See `docs/product/release-notes.md` for history.

## Directory Map
| Directory | Purpose |
|-----------|---------|
| `architecture/` | High-level system design and code structure |
| `backend/` | API, data, development guides |
| `frontend/` | UX specs, architecture, testing |
| `policy/` | EA compliance policies and governance |
| `ops/` | Deployment, automation, runbooks |
| `product/` | User guides, stories, release notes |
| `testing/` | Test strategies and matrices |
| `rfc/` | Requests for change and historical plans |
| `references/` | Glossaries and supporting material (planned) |

## Getting Help
- Raise documentation issues in the repo tracker with the `docs` label.
- For EA interpretation questions contact the policy owner listed in `docs/policy/backend-ssot.md`.

## Glossary
A shared glossary will live under `docs/references/glossary.md` (to be authored).

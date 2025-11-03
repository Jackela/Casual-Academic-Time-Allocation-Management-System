# Implementation Plan: Frontend EA Compliance Wiring

**Branch**: `[004-frontend-ea-compliance]` | **Date**: 2025-11-03 | **Spec**: specs/004-frontend-ea-compliance/spec.md
**Input**: Feature specification from `/specs/004-frontend-ea-compliance/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Wire the existing EA-compliant backend endpoints into the frontend: add five service functions in `frontend/src/services/timesheets.ts`, refactor TutorDashboard to use `/api/timesheets/me`, enforce explicit Tutor confirmation via `PUT /api/timesheets/{id}/confirm` before Lecturer approval, and add an “Approval History” section using `/api/approvals/history/{timesheetId}`. Pending queues: Lecturer → `/api/timesheets/pending-approval`, Admin/HR → `/api/approvals/pending`. Centralize confirm→approve in the shared TimesheetTable action handler.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (React 19)  
**Primary Dependencies**: Playwright/Vitest (tests), axios (via secureApiClient), React Query-like hooks (internal)  
**Storage**: N/A (frontend-only wiring)  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Web (Vite)  
**Project Type**: web monorepo (frontend folder)  
**Performance Goals**: No new performance risks; API calls should render lists <2s in test env  
**Constraints**: Must not change backend APIs; centralize confirm→approve in TimesheetTable  
**Scale/Scope**: Limited to service additions + three component touch points

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Adheres to separation of concerns (service layer + shared UI handler). No backend changes. Centralized workflow logic reduces duplication. Tests planned before refactor (TDD where practical) to pin endpoint usage and UI flows.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: Use existing frontend structure; add service functions in `frontend/src/services/timesheets.ts`, update TutorDashboard, shared TimesheetTable action handler, and TimesheetDetailView.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

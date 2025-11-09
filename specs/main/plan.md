# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- SSOT (Single Source of Truth):
  - No client-sent monetary fields in submissions
  - Quote flow present and exercised for input changes
  - Server-side recompute enforced on create/update
- API Contract First:
  - OpenAPI path(s) added/updated for the feature
  - Contract tests cover request/response and errors
- Tests:
  - Unit tests for calculator/policy changes
  - Integration tests for controller/persistence paths
  - E2E for critical UI flows (quote, submission, approvals) as needed
- Security & Workflow:
  - Role/authorization checks verified
  - State machine transitions/invariants asserted
- Observability & Audit:
  - Structured logs on key events
  - Persisted rate metadata (rateCode, formula, clause)

## Project Structure

### Documentation (this feature)

```
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

```
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

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

---

## E2E US1 Canonicalization (Admin Users)

This section codifies authoritative conventions for the US1 admin users flow and links to SSOT.

- Routes (UI):
  - Admin Users page: `/admin/users` (admin-only access). Non-admins are redirected/denied per auth policy.

- API Endpoints (SSOT-aligned):
  - Create user: `POST /api/users` → 201 `UserResponse`
  - Toggle activation: `PATCH /api/users/{id}/activation` → 200 with updated `UserResponse`
  - Who-am-I (preferred) and fallbacks: `GET /api/auth/whoami` | `GET /api/users/me` | `GET /api/me`
  - OpenAPI SSOT: `docs/openapi.yaml`, with users/auth under `docs/openapi/paths/users.yaml`, `docs/openapi/schemas/users.yaml`, `docs/openapi/paths/auth.yaml`, `docs/openapi/schemas/authentication.yaml`.

- Authentication Policy (E2E):
  - Programmatic-only authentication via `frontend/e2e/api/auth-helper.ts#programmaticLoginApi('ADMIN')`.
  - Each spec binds its own `storageState`; no UI login fallback permitted.
  - After login, session is applied to the page and a single reload awaits `networkidle`.

- Password Policy (align with backend SSOT):
  - Min length ≥ 8; must include ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 symbol.
  - Client validates; server enforces; violations return 422 with structured error per `docs/openapi/schemas/users.yaml`.

- Canonical data-testid (US1 subset; full list in `specs/e2e-refactor/plan.md` §3):
  - `admin-users-table`, `admin-user-create-btn`, `admin-user-qualification-select`
  - Activation buttons: `admin-user-activate-btn` / `admin-user-deactivate-btn`
  - Status chips: `status-chip-active` / `status-chip-inactive`
  - Toasts: `toast-success`, `toast-error`
  - Visibility rule: "visible" means element is attached and not hidden/covered; gate waits on enabled where interaction is required.

- Success & Error Messaging:
  - Success toast content pattern includes semantic message (e.g., "User created"); PII such as email may be redacted in assertions.
  - Error toasts on 4xx/5xx with stable testid; form retains entered values to allow retry.

- Idempotency & State Mapping:
  - Two PATCH toggle actions in sequence must both return 200; UI reflects active/inactive transitions each time.
  - If payload exposes both `isActive` and `active`, treat either true as active; absent fields default to inactive for display.

- Ambiguity Quantification:
  - "Immediately" means within 3s or upon first successful whoami-like probe, whichever is earlier.
  - "Visible" uses Playwright's `toBeVisible()` semantics; readiness may optionally include a whoami probe.

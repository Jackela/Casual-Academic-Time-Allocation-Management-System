# E2E Requirements Quality Checklist — CATAMS (US1 Focus)

Purpose: Unit tests for the English quality of E2E requirements (not implementation).  
Created: {{DATE}}  
Scope: US1 (Admin creates Tutor user) within the E2E refactor initiative  
Sources: tasks.md, quickstart.md, plan.md (template)

## Requirement Completeness
- [x] CHK001 Are preconditions for US1 (admin authentication state, role constraints) explicitly specified? [Completeness, Tasks §Phase 3 — US1]
- [x] CHK002 Are all success outputs for create user listed (toast, table row, response code/schema)? [Completeness, Tasks §Phase 3 — US1]
- [x] CHK003 Are activation/deactivation expected state transitions and UI indicators enumerated? [Completeness, Tasks §Phase 3 — US1]
- [x] CHK004 Are required environment variables and their locations fully enumerated for E2E setup? [Completeness, Quickstart §Environment]
- [x] CHK005 Are all involved routes/paths (UI + API) named canonically and centralized (e.g., /admin/users, POST/PATCH /api/users)? [Completeness, Tasks §Phase 3 — US1]
- [x] CHK006 Is the password policy fully captured (length, composition, server vs client validation, error messaging)? [Completeness, Tasks §Phase 3 — US1]
- [x] CHK007 Are negative/validation scenarios included for create user (e.g., weak password, duplicate email)? [Completeness, [Gap]]
- [x] CHK008 Is the expected idempotency behavior for toggling activation documented (including no-op semantics)? [Completeness, Tasks §Phase 3 — US1]

## Requirement Clarity
- [x] CHK009 Is “success toast” defined with severity, test-id, and expected text content pattern? [Clarity, Tasks §Phase 2 — T014]
- [x] CHK010 Are “row appears in admin-users-table” columns and exact identifiers/labels specified? [Clarity, Tasks §Phase 3 — US1]
- [x] CHK011 Are “activate/deactivate” labels, button state, and status chip wording explicitly stated and consistent? [Clarity, Tasks §Phase 3 — US1]
- [x] CHK012 Is the password policy quantified (e.g., minLength ≥ 8, character classes) rather than vague? [Clarity, Tasks §Phase 3 — US1]
- [x] CHK013 Are API codes and minimal schema fields (UserResponse) enumerated rather than implied? [Clarity, Tasks §Phase 3 — US1]
- [x] CHK014 Is the term “canonical test IDs” mapped to a definitive list for this flow? [Clarity, Tasks §Phase 2 — Foundational]

## Requirement Consistency
- [x] CHK015 Do stated UI test-ids match those used in the Foundational phase (e.g., toast-success, admin-users-table)? [Consistency, Tasks §Phase 2 — T010–T014]
- [x] CHK016 Are API endpoints for users consistent across services, docs, and test references (USERS.BASE vs /api/users)? [Consistency, [Gap]]
- [x] CHK017 Does role-based access stated for Admin align across routing and page protection requirements? [Consistency, Tasks §Phase 3 — US1]
- [x] CHK018 Do password policy statements align with OpenAPI/SSOT contracts if referenced elsewhere? [Consistency, [Gap]]

## Acceptance Criteria Quality (Measurability)
- [x] CHK019 Can success be objectively determined for creation (201 code + schema fields present + UI toast shown)? [Acceptance Criteria, Tasks §Phase 3 — US1]
- [x] CHK020 Are measurable checks defined for toggle (two successive 200s with visible label/status change each time)? [Acceptance Criteria, Tasks §Phase 3 — US1]
- [x] CHK021 Are clear criteria defined for when create must be rejected for password policy violations? [Acceptance Criteria, [Gap]]
- [x] CHK022 Is there a measurable definition of “idempotent toggle” (e.g., same final state, consistent response payload)? [Acceptance Criteria, [Gap]]

## Scenario Coverage
- [x] CHK023 Are alternate flows captured (e.g., retry after failure, server returns validation errors, email already exists)? [Coverage, [Gap]]
- [x] CHK024 Are exception flows captured (backend 5xx, network errors, auth expiry) with expected requirement outcomes? [Coverage, [Gap]]
- [x] CHK025 Are recovery flows defined (e.g., how UI state or instructions guide admin after failed create/toggle)? [Coverage, [Gap]]

## Edge Case Coverage
- [x] CHK026 Are edge cases like leading/trailing spaces in email/name, unusual Unicode, or extremely long values addressed? [Edge Case, [Gap]]
- [x] CHK027 Are cases where server returns either isActive or active fields documented for display logic? [Edge Case, Tasks §Phase 2 — Foundational]

## Non-Functional Requirements
- [x] CHK028 Are E2E flake-resilience requirements (no waitForTimeout, explicit waits) explicitly mandated and scoped? [NFR, Tasks §Phase 2 — Foundational]
- [x] CHK029 Are security/authorization requirements stated for US1 (admin-only access, storage state handling, JWT scope)? [NFR, [Gap]]
- [x] CHK030 Are observability requirements defined (logs/events for create/toggle) for troubleshooting? [NFR, Plan §Constitution Check]

## Dependencies & Assumptions
- [x] CHK031 Are environment/run-time dependencies (backend URL, frontend URL, credentials) specified and testable as assumptions? [Dependencies, Quickstart §Environment]
- [x] CHK032 Is the single-source-of-truth for API contracts identified and linked (OpenAPI doc location)? [Dependencies, [Gap]]
- [x] CHK033 Are sequencing dependencies captured (US1 prerequisite to US2–US5) and enforced in requirements? [Dependencies, Tasks §Dependencies]

## Ambiguities & Conflicts
- [x] CHK034 Are any ambiguous terms (e.g., “immediately”, “visible”) replaced by specific thresholds or states? [Ambiguity, [Gap]]
- [x] CHK035 Are conflicts between tasks and actual UI routes/test-ids resolved and documented? [Conflict, Tasks §Phase 2/3]
- [x] CHK036 Is the admin navigation path canonicalized (/admin/users) and validated against router definitions? [Ambiguity, Tasks §Phase 3 — US1]

---
Meta:
- Depth: Standard  
- Audience: Reviewer (PR)  
- Focus Areas: US1 E2E requirements quality; Auth/Routes/Contracts alignment  
- Traceability: Items reference Tasks/Quickstart/Plan where possible; [Gap] markers indicate missing/unclear areas

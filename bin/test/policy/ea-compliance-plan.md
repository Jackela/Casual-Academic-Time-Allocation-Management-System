# EA Compliance Master Plan

This plan defines the multi-phase program required to make the Casual Academic Time Allocation Management System (CATAMS) fully compliant with the **University of Sydney Enterprise Agreement 2023-2026** (EA) while aligning with the existing **Single Source of Truth (SSOT)** expectations captured in the timesheet workflow analysis. The overarching objective is to centralise every monetary decision inside the backend Rules Engine so that the database and APIs become the canonical source of rates, associated hours, and payable amounts.

---

## Phase 1: Backend Foundation – The Rules Engine & Calculator

### 1.1 Database Schema
- **`policy_version`**
  - Columns: `id` (PK), `ea_reference` (e.g. `"EA-2023-2026-Schedule-1"`), `major_version`, `minor_version`, `effective_from`, `effective_to` (nullable), `source_document_url`, `notes`.
  - Purpose: track every EA release or interim determination; only one active row overlaps a given date range.
  - Constraints: enforce non-overlapping `[effective_from, effective_to)` ranges; unique index on `(ea_reference, major_version, minor_version)`.
- **`rate_code`**
  - Columns: `id` (PK), `code` (e.g. `P01`, `TU3`, `AO2`, `M04`), `task_type` (`LECTURE`, `TUTORIAL`, `ORAA`, `DEMO`, `MARKING`, …), `description`, `default_associated_hours`, `default_delivery_hours`, `requires_phd` (bool), `is_repeatable` (bool), `ea_clause_reference`.
  - Purpose: catalogue Schedule 1 pay codes and capture metadata such as default associated hours (e.g. lecture P03 includes up to 2 associated hours, TU1 includes up to 2, repeats only up to 1 hour, etc.).
  - Constraints: unique `code`; FK to lookup table `task_type`.
- **`rate_amount`**
  - Columns: `id` (PK), `rate_code_id` (FK), `policy_version_id` (FK), `year_label` (`2023-07`, `2024-07`, `2025-07`, `2026-06`), `effective_from`, `effective_to`, `hourly_amount_aud`, `max_associated_hours`, `max_payable_hours`, `qualification` (`PHD`, `COORDINATOR`, `STANDARD`), `notes`.
  - Purpose: store the year-specific amounts and any overrides to the baseline metadata. Use check constraints to keep `max_associated_hours` within EA-defined caps (e.g. tutorials cannot exceed 2 hours associated, repeats capped at 1).
  - Indexes: composite `(rate_code_id, effective_from)` for fast lookups; partial index on `(rate_code_id, qualification)` when `qualification IS NOT NULL`.
- **Migration Strategy**
  - Produce an initial migration that seeds Schedule 1 data for the 2023-2026 EA (codes P01–P04, TU1–TU4, AO1–AO2, DE1–DE2, M03–M05, and other relevant codes).
  - Store original table snapshots for audit and create a stored procedure to archive superseded policy rows when new EA versions are published.
  - Add a materialised view `active_rate_snapshot` that joins the three tables for the current date to simplify read access for calculators and reporting.

### 1.2 Domain Model
- Extend the **`TimesheetEntry`** aggregate (or equivalent domain entity) with:
  - `taskType: TaskType` – enum with values `LECTURE`, `TUTORIAL`, `ORAA`, `DEMO`, `MARKING`, `OTHER` (must match `rate_code.task_type`).
  - `isRepeat: boolean` – persisted flag; computed by the calculator during quote, locked when entry is saved; true when EA repeat conditions are met (same unit/session delivered within seven days).
  - `qualification: TutorQualification` – enum (`PHD`, `COORDINATOR`, `STANDARD`) drawn from people data or manual override, determines whether TU1 vs TU2 etc. apply.
  - `deliveryHours` – hours submitted by lecturer; validated against EA limits.
  - `associatedHours` – calculator output reflecting Schedule 1 entitlements (e.g. TU1 includes up to 2 hours; repeat tutorial only up to 1 hour).
  - `rateCode` – reference to the EA rate code used at calculation time to keep historical fidelity.
  - `payableHours` – `deliveryHours + associatedHours` unless overridden by EA rules (e.g. marking tasks use hourly rates without automatic association).
  - `amount` – total amount for the line item; always computed server-side.
  - `calculationBreakdown` – JSON column storing structured metadata (formula, warnings such as “Associated hours capped at 2 by Schedule 1 clause 2”, whether marking hours were split).
- Ensure aggregates expose read-only getters for financial data so callers cannot mutate amounts after calculation; guard invariants via domain services.
- Update persistence layer (JPA entities, repositories) and DTOs so that financial fields are never mapped from client payloads; they must always come from the calculator output.

### 1.3 Policy & Calculator Services
- **`Schedule1PolicyProvider`**
  - Responsibilities: resolve the correct `rate_code` + `rate_amount` for a given `taskType`, `eventDate`, `qualification`, and `isRepeat`; fetch associated hours caps and EA clause references; expose convenience methods such as `getRepeatEligibilityWindow()` (7 days) and `getContemporaneousMarkingPolicy()`.
  - Implementation: cache-active rates in memory with a time-based refresh; allow override by policy version ID for retrospective adjustments; log audit trails with policy version used.
- **`Schedule1Calculator`**
  - Input: minimal timesheet data (`tutorId`, `courseId`, `taskType`, `eventDate`, `deliveryHours`, `isRepeat`, `qualification`, `markingCategory`, `manualAssociatedHours?`).
  - Flow:
    1. Query `Schedule1PolicyProvider` for applicable `rateCode`.
    2. Determine repeat eligibility by examining prior approved entries within seven days for same tutor + task + course (per EA repeat definition for lectures/tutorials).
    3. Apply task-specific logic:
       - **Lectures (P01–P04)**: cap associated hours at EA limits (4 for visiting scholar, 3 for significant responsibility/developed lecture, 2 for standard, 1 for repeat). Ensure `isRepeat` only true when identical content delivered in a rolling 7-day window.
       - **Tutorials (TU1–TU4)**: base tutorials include up to 2 hours associated; repeat tutorials include up to 1 hour. Flag `associatedHours` = `min(requested, policyCap)`. Enforce qualification mapping (PhD/coordinator → TU1/TU3, others → TU2/TU4).
       - **Other Required Academic Activities & Demonstrations (AO1/AO2, DE1/DE2)**: treat as hourly tasks; associated hours remain zero unless EA item explicitly grants extra time (rare). Accept stacking with tutorials but prevent double counting the same hour block.
       - **Marking (M03, M04, M05)**: only create separate payable hours when marking is non-contemporaneous. If `taskType` is `MARKING` yet user attempts to attach to a tutorial with contemporaneous hours, enforce EA rule that those hours are already included in the tutorial session and reject or auto-set to zero.
       - **Combined Scenarios**: support EA clause allowing extra ORAA hours granted through review process; surface as warnings that manual top-ups require policy override tokens.
    4. Compute `payableHours` = `deliveryHours + associatedHours` for sessional work, or `deliveryHours` for hourly tasks.
    5. Compute `amount = payableHours * hourly_amount_aud`, round to cents (Banker’s rounding).
    6. Return full calculation artifact (rate metadata, clause references, breakdown).
  - Non-functional requirements: instrument with telemetry (calculation success rate, fallback occurrences), add structured audit logs referencing EA clause for compliance reviews.
- **Repeat & Double-Counting Controls**
  - Maintain a `timesheet_repeat_tracker` materialised view keyed by tutor/course/task/date for quick repeat detection.
  - When a marking line is calculated, cross-check for any parent teaching line on same date/time and mark the marking entry as `nonContemporaneous` (otherwise set amount to 0 and emit warning).

### 1.4 Unit Testing
- Create a unit test matrix that covers:
  - Every Schedule 1 pay code in scope (P01–P04, TU1–TU4, AO1–AO2, DE1–DE2, M03–M05 at minimum).
  - Qualification permutations (PhD, Coordinator, Standard).
  - Repeat vs. non-repeat scenarios for lectures and tutorials including 6-day success and 8-day failure cases.
  - Boundary conditions: delivery hours at zero (reject), associated hours exceeding policy cap (auto-truncate + warning), marking flagged as contemporaneous (should auto-zero).
  - Year-based rate changes (e.g. assert that a tutorial on 2024-07-05 uses 2024 rates, while 2023-12-01 uses 2023 rates).
  - Regression coverage whenever a new `policy_version` is introduced.
- Implement parameterised tests that read from a YAML matrix to prevent drift and make it easy to cross-check against the official schedule tables.
- Add contract-level assertions for calculation breakdown (formula strings must match UI transparency requirements).

---

## Phase 2: API Contract Refactoring

### 2.1 New Quoting API (`POST /timesheets/quote`)
- **Purpose:** supply frontend with authoritative calculations on every change.
- **Request Payload (minimal front-end input):**
  ```jsonc
  {
    "tutorId": "uuid",
    "courseId": "uuid",
    "taskType": "TUTORIAL",
    "eventDate": "2025-03-12",
    "deliveryHours": 1.0,
    "qualification": "STANDARD",
    "isRepeatHint": true,              // optional client hint; server will verify
    "markingCategory": null,           // e.g. "M03" when taskType = MARKING
    "sourceEntryId": "optional-original-entry"
  }
  ```
- **Response Payload:**
  ```jsonc
  {
    "rateCode": "TU2",
    "deliveryHours": 1.0,
    "associatedHours": 2.0,
    "payableHours": 3.0,
    "hourlyAmountAud": 169.58,
    "amountAud": 508.74,
    "isRepeat": false,
    "warnings": [
      "Associated hours capped at 2.0 per Schedule 1 clause 2."
    ],
    "formula": "1.0h delivery + 2.0h associated (Schedule 1 TU2)",
    "timestamp": "2025-03-10T02:20:31Z"
  }
  ```
- **Behaviour:**
  - Ignores any client-provided amounts; re-validates repeat eligibility and qualification.
  - Returns structured warnings (double-count prevention, manual override reminders).
  - Returns HTTP 409 with error payload when requested scenario violates EA (e.g. repeat request outside 7-day window) so the UI can surface the issue.
- **Security & Performance:** enforce lecturer/tutor role permissions, rate-limit to prevent abuse, and add response caching keyed by hash of payload for short-lived scenarios to reduce load during rapid form edits.

### 2.2 Existing API Hardening (`POST /timesheets`, `PUT /timesheets/{id}`)
- Strip financial fields (`associatedHours`, `payableHours`, `amount`, `rateCode`) from request DTOs; server always recalculates by invoking `Schedule1Calculator` before persisting.
- Persist calculator output as part of a transaction that includes workflow state transitions defined in the SSOT workflow document.
- Add optimistic locking to prevent stale frontends from overwriting recalculated values.
- Enforce that manual overrides (e.g. additional ORAA hours granted post-review) require a privileged flag and audit note referencing EA clause or HR exception.
- Backfill existing records: create a one-off migration script that recalculates legacy entries and stores the policy version + breakdown, flagging any mismatches for manual review.

### 2.3 Integration Testing
- Build Spring Boot (or equivalent) integration suites covering:
  - Full quote-to-save flow, validating the same calculation result is achieved via `/timesheets/quote` and persisted entry.
  - Error cases: repeat outside 7 days, missing qualification, attempts to send amounts from client (should be ignored).
  - Non-contemporaneous marking workflows (quote, save, subsequent HR approval).
- Implement contract tests using Pact or OpenAPI-driven tests so frontend consumers can validate schema changes early.
- Add data fixtures seeded from Schedule 1 tables to ensure integration tests stay aligned with EA updates.
- Automate regression matrix execution in CI for every new `policy_version`.

---

## Phase 3: Frontend Transformation – Display Layer Only

### 3.1 Form Refactoring
- Remove all legacy calculation utilities; replace with a typed `QuoteClient` that calls `/timesheets/quote` on every material input change (task type, date, hours, qualification, repeat flag).
- Implement debounced calls with optimistic UI to maintain responsiveness while ensuring backend remains source of truth.
- Lock `associatedHours`, `payableHours`, and `amount` fields as read-only; display realtime updates from quote responses.
- Handle validation errors from the backend (e.g. repeat eligibility) by surfacing inline error banners tied to the relevant field.

### 3.2 Enhanced UI Transparency
- Display `rateCode` and `formula` returned by the calculator in the entry details panel.
- Add a collapsible “EA Breakdown” component that shows:
  - Clause reference (e.g. “Schedule 1, Section 2 – Tutorials”).
  - Delivery vs. associated hours.
  - Qualifier used (PhD/Coordinator/Standard) and repeat determination.
- Provide contextual tooltips for warnings (e.g. “Contemporaneous marking already included in tutorial session, no extra pay”).
- Capture calculator warnings in form-level alerts so lecturers and tutors understand compliance decisions before submission.

### 3.3 Code Cleanup
- Delete obsolete client-side constants (hard-coded rate tables, local schedule JSON).
- Centralise task type enums so they match backend definitions; add TypeScript types generated from OpenAPI spec to prevent drift.
- Remove legacy mark-up that attempted to compute totals, ensuring the UI simply renders backend data.
- Update state management to store both raw user input and the last quote payload, enabling quick diffs when backend returns adjustments.

---

## Phase 4: E2E Validation & Demo Enhancement

### 4.1 E2E Test Refactoring
- Update Playwright “golden path” scripts to:
  - Assert the formula string and breakdown display for different scenarios (e.g. standard tutorial vs. repeat tutorial for PhD-qualified tutor).
  - Validate that editing delivery hours triggers a quote, UI updates read-only totals, and persisted data matches backend calculations.
  - Cover negative flows (repeat beyond 7 days, marking double-count attempt) ensuring UI surfaces backend warnings.
- Synchronise demo narratives so that live walkthroughs showcase backend-driven calculations, explicitly calling out EA compliance features.
- Extend E2E coverage to include HR finalisation flows verifying that recalculation still happens on PUT/PATCH operations.
- Capture screenshots and HTML traces for auditing EA adherence during release reviews.

---

## Governance, Rollout & Success Metrics
- **Rollout Sequence:** complete Phase 1 before exposing `/quote`; gate Phase 2 deployment behind feature toggles; coordinate Phase 3 rollout after API smoke tests; execute Phase 4 when backend + frontend changes are stable.
- **Change Management:** publish migration SOP for new EA versions (how to ingest Schedule updates, re-run regression suite, notify stakeholders).
- **Success Metrics:** zero client-calculated financial fields, 100% calculator coverage for Schedule 1 rate codes, automated regression suite passing, and audit logs referencing policy versions for every payable line item.
- **Operational Readiness:** train HR/payroll teams on new auditing screens, update documentation, and monitor quote latency (<150 ms p95) plus calculator error rate (<0.5%).

This phased plan positions CATAMS to meet the Enterprise Agreement obligations while honouring the project’s SSOT principles, ensuring that every stakeholder trusts the backend as the definitive authority for payment calculations.

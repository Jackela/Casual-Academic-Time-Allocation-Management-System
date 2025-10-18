# Backend Data Model (EA Schedule 1)

## Purpose
This note explains how CATAMS persists Enterprise Agreement policy data and EA-compliant timesheets. It replaces the former "microservices organization" document.

## Policy Catalogue

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `policy_version` | `id`, `ea_reference`, `major_version`, `minor_version`, `effective_from`, `effective_to`, `source_document_url` | Tracks each Enterprise Agreement revision. Date ranges must not overlap; a GiST exclusion index enforces this.
| `rate_code` | `id`, `code`, `task_type`, `description`, `default_delivery_hours`, `default_associated_hours`, `requires_phd`, `is_repeatable`, `ea_clause_reference` | Canonical list of Schedule 1 task codes (tutorials TU1-TU4, lectures P01-P04, marking M03-M05, etc.).
| `rate_amount` | `id`, `rate_code_id`, `policy_version_id`, `qualification`, `effective_from`, `effective_to`, `hourly_amount_aud`, `max_delivery_hours`, `max_associated_hours`, `max_payable_hours` | Stores the monetary values and per-session caps for each code, qualification, and year within a policy version.

### Seeding
Flyway migration `V13__Seed_schedule1_rates.sql` (and subsequent migrations) populate the codes and rates extracted directly from the University of Sydney Enterprise Agreement 2023-2026. New agreements must be added as additional `policy_version` rows with non-overlapping effective windows.

## Timesheet Aggregate
The `timesheets` table now captures both tutor-supplied input and calculator output.

| Column | Type | Source |
|--------|------|--------|
| `task_type` | `varchar` | Enum persisted from `TimesheetTaskType` (LECTURE, TUTORIAL, ORAA, DEMO, MARKING, etc.).
| `qualification` | `varchar` | Enum persisted from `TutorQualification` (STANDARD, COORDINATOR, PHD).
| `is_repeat` | `boolean` | Indicates if the session is a repeat within seven days.
| `delivery_hours` | `numeric(8,2)` | Tutor input.
| `associated_hours` | `numeric(8,2)` | Calculated by `Schedule1Calculator` based on task type, qualification, and repeat rules.
| `payable_hours` | `numeric(8,2)` | Calculated; includes delivery + associated hours subject to EA caps.
| `hourly_rate` | `numeric(10,2)` | Calculated from policy catalogue (often derived from total session amount divided by payable hours).
| `amount` | `numeric(12,2)` | Final payable amount produced by the calculator.
| `rate_code` | `varchar` | Code (e.g., TU1) resolved by the policy provider.
| `rate_version` | `varchar` | Human-readable reference to the policy version used.
| `formula` | `varchar` | Calculator narrative (e.g., `1h delivery + 2h associated`).
| `clause_reference` | `varchar` | EA clause identifier for the calculation.

All calculator-managed columns are recalculated on every create/update regardless of the payload sent by the client. Historical rows keep the rate code and version used at the time of calculation.

## Repositories
- `PolicyVersionRepository` and `RateAmountRepository` provide date-effective lookups.
- `TimesheetRepository` exposes standard CRUD operations; application services are responsible for invoking the calculator before calling `save`.

## Migration Checklist
1. Add new policy data via Flyway migration.
2. Update `Schedule1PolicyProvider` tests with new effective date coverage.
3. Backfill `rate_version` on historical rows if the policy definition changes mid-term.
4. Communicate UI transparency requirements when clauses change.

## References
- `docs/backend/api-timesheets.md`
- `docs/policy/ea-schedule1-overview.md` *(planned)*
- `src/main/resources/db/migration/`

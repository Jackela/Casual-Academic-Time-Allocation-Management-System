# EA Schedule 1 Overview

This document summarises the Enterprise Agreement (EA) clauses that govern Schedule 1 payments and how CATAMS enforces them.

## Source
- University of Sydney Enterprise Agreement 2023-2026 (Schedule 1: Casual Academic Rates).

## Key Concepts
- **Rate Codes** ? TU1-TU4 (tutorials), P01-P04 (lectures), M03-M05 (marking). Each maps to a specific clause and hourly amount.
- **Qualifications** ? Standard, Coordinator, and PhD pay bands.
- **Associated Working Time** ? Tutorial sessions attract additional payable hours (up to 2 hours; repeat tutorials limited to 1 hour).
- **Effective Dates** ? Rates change each EA year. CATAMS stores start/end dates per rate to ensure back pay accuracy.

## CATAMS Enforcement
- Policy data is loaded into the `policy_version`, `rate_code`, and `rate_amount` tables via Flyway migrations.
- `Schedule1PolicyProvider` resolves the correct rate at runtime based on task type, qualification, repeat flag, and session date.
- `Schedule1Calculator` applies rule logic (tutorial repeat caps, lecture multipliers, marking exclusions) and returns the official payable amount.

## Maintenance Checklist
1. Parse the newly published EA and update the rate catalogue.
2. Add new policy migrations and extend calculator tests for the new effective period.
3. Update UI copy to reflect clause changes and communicate to stakeholders.

For detailed policy governance see `docs/policy/backend-ssot.md` and `docs/policy/timesheet-ssot.md`.

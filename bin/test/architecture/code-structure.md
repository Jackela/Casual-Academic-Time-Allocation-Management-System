# Code Structure Guide

## Repository Layout
```
Casual-Academic-Time-Allocation-Management-System/
??? docs/
?   ??? architecture/
?   ??? backend/
?   ??? frontend/
?   ??? ops/
?   ??? policy/
?   ??? product/
?   ??? testing/
?   ??? references/ (planned)
??? src/
?   ??? main/java/com/usyd/catams/
?   ?   ??? controller/
?   ?   ??? service/
?   ?   ??? entity/
?   ?   ??? dto/
?   ?   ??? mapper/
?   ?   ??? config/
?   ??? main/resources/
?   ?   ??? application.yml
?   ?   ??? db/migration/
?   ??? test/java/com/usyd/catams/
??? frontend/
?   ??? src/
?   ?   ??? components/
?   ?   ??? hooks/
?   ?   ??? lib/ (quote client lives here)
?   ?   ??? pages/
?   ??? e2e/
?   ??? playwright-report/
??? scripts/ and tools/scripts/
??? infra/
??? README.md
```

## Backend Modules
- `controller/TimesheetController` ? exposes `/api/timesheets` and `/api/timesheets/quote`.
- `service/TimesheetApplicationService` ? orchestrates persistence and calculator usage.
- `service/Schedule1Calculator` and `Schedule1PolicyProvider` ? quote and calculation engine.
- `entity/Timesheet` ? EA-compliant aggregate with calculator-managed fields.
- `repository/` ? Spring Data JPA repositories for timesheets and policy tables.

## Frontend Modules
- `components/TimesheetForm` ? renders read-only calculation summary.
- `hooks/useTimesheetQuote` ? calls the quote client when inputs change.
- `lib/timesheetQuoteClient.ts` ? Axios wrapper for `/api/timesheets/quote`.
- `e2e/quote-calculation-flow.spec.ts` ? ensures requests and submissions match SSOT policy.

## Testing Layout
- `src/test/java/.../service` ? unit tests for calculator and policy provider.
- `src/test/java/.../controller` ? integration tests including `TimesheetControllerIntegrationTest`.
- `frontend/e2e/` ? Playwright tests (mock, real, visual).
- `frontend/src/test/` ? Vitest unit tests.

## Documentation Entries
- `docs/index.md` (planned) will act as the entry point.
- Architecture, backend, frontend, and policy guides are grouped under the directories above for discoverability.

Keep this guide updated when new modules or directories are introduced.

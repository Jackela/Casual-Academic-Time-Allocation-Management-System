# Frontend UX Specification

This document captures the current UI behaviour after the Schedule 1 refactor.

## Global Principles
- The frontend is a display layer for backend-calculated financial data.
- All state derived from quotes is treated as read-only and expires when inputs change.
- Accessibility: forms expose calculation formulas and clause references so tutors understand Schedule 1 decisions.

## Timesheet Creation Flow

1. **Open Modal / Page** ? Loads tutor context and fetches course list.
2. **Input Changes** ? Whenever task type, qualification, delivery hours, repeat flag, or session date changes, the form debounces the request and calls `POST /api/timesheets/quote` via the new quote service (`frontend/src/lib/timesheetQuoteClient.ts`).
3. **Display Results** ? The response populates read-only fields for associated hours, payable hours, hourly rate, total amount, and formula. Fields are annotated with clause references (e.g., "Schedule 1 Item 1").
4. **Submit** ? `POST /api/timesheets` sends only tutor-entered fields plus identifiers (courseId, tutorId). Financial fields are intentionally omitted.
5. **Confirmation** ? On success the UI shows the calculated totals returned by the backend and appends them to the dashboard table.

### Form Layout

| Section | Fields | Notes |
|---------|--------|-------|
| Session Details | Course selector, task type, session date | Task type options sourced from backend enumerations. |
| Delivery | Qualification, repeat flag, delivery hours | Delivery hours input validates positive values before quote call. |
| Calculation Summary (read-only) | Associated hours, payable hours, hourly rate, total amount, formula, clause reference | Values sourced from the latest quote response. |
| Metadata | Description, attachments (future) | Optional notes; no financial data allowed. |

Error handling: if the quote request fails (400/404), the UI shows inline validation messages and disables submission until a valid quote is retrieved.

## Dashboard Transparency
- Timesheet list columns include rate code, rate version, and amount.
- Hover tooltips reveal the stored formula and clause reference for each row.

## Accessibility & Localization
- Read-only financial fields use `aria-live="polite"` so screen readers announce updates after each quote.
- Clause references map to human-readable descriptions; future localisation hooks live in `frontend/src/i18n/`.

## Testing
- Playwright spec `frontend/e2e/quote-calculation-flow.spec.ts` mocks the API to ensure the quote endpoint is called and that submissions exclude financial fields.
- Visual regression snapshots capture the modal showing the read-only calculation summary.

## Related Docs
- `docs/backend/api-timesheets.md`
- `docs/policy/timesheet-ssot.md`
- `docs/frontend/testing.md` *(planned)*

# Frontend Architecture

## Stack
- React 18 with TypeScript and Vite.
- State management via React Query and context providers.
- Axios-based API clients with interceptors for JWT handling.

## Quote Workflow Modules
- `src/lib/timesheetQuoteClient.ts` ? wraps Axios instance for `/api/timesheets/quote`.
- `src/hooks/useTimesheetQuote.ts` ? debounces input changes and triggers quotes.
- `src/components/TimesheetForm.tsx` ? renders the form and read-only calculation summary.
- `src/components/TimesheetSummaryPanel.tsx` ? displays rate code, rate version, formula, and clause reference.

## Data Flow
1. User edits form fields.
2. Hook triggers a quote request (debounced) and stores the latest result in component state.
3. Read-only fields render from the quote response.
4. Form submission constructs payload without financial fields and posts to `/api/timesheets`.
5. Upon success, React Query invalidates the timesheet list cache.

## Error Handling
- Quote failures show inline validation errors and disable submit until resolved.
- Network errors fallback to toast notifications with retry actions.

## Testing Hooks
- Unit tests cover hooks using MSW to mock API responses.
- Playwright E2E spec verifies the quote request is issued and financial fields are excluded from the POST payload.

## Related Documents
- `docs/frontend/ux-spec.md`
- `docs/frontend/testing.md`
- `docs/backend/api-timesheets.md`

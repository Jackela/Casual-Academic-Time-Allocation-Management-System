EA Schedule 1 Implementation Report (Frontend + Backend)

Summary based solely on the provided engineering logs and notes.

Frontend

- Preview-authoritative capture (E2E):
  - The E2E captureQuote helper was refactored to treat the on-screen Calculated Pay Summary preview as the single source of truth. It polls the preview container until a non-empty Rate Code is visible, then reads all fields (rateCode, qualification, associatedHours, payableHours, hourlyRate, amount, formula) directly from the DOM.
  - Network responses are listened to opportunistically. When present, the requestBody (e.g., repeat) is extracted for assertions, but assertions rely on the preview contents to avoid flakiness due to aborted/fast-follow requests.
  - For repeat toggling, the helper also “pokes” Delivery Hours (focus → Tab) to guarantee a quote cycle even if the prior request was aborted by debounce.

- Create Timesheet UI validation rules (key Tutorial changes):
  - Task Type: Tutorial delivery hours must be exactly 1.0h. The form shows an inline error and blocks submission if Tutorial deliveryHours != 1.0.
  - Associated-time caps are communicated in the guidance: standard Tutorial allows up to 2.0h associated time; repeat Tutorial allows up to 1.0h associated time.
  - Repeat help text is context-aware: “same content within 7 days for a different group,” matching EA intent while backend enforces the 7‑day window strictly.
  - Other types (ORAA/DEMO/Marking) accept hourly fractions (step configured), with inline numeric validation and accessibility attributes (aria-describedby) for hints/errors.

- Calculated Pay Summary (preview as formula guide):
  - The preview panel shows a structured summary: Rate Code, Qualification, Associated Hours, Payable Hours, Hourly Rate, Total Amount, and Formula.
  - The Formula explains the calculation for transparency. For Tutorial, it implicitly reflects that delivery is fixed at 1.0h and the associated time cap (≤2.0h standard, ≤1.0h repeat) is already baked into Payable Hours.
  - For repeat tutorials, an additional note appears when capping affects payable hours, referencing EA Schedule 1. Clause references can be displayed when provided by the backend calculator.

Backend

- API boundary validation (Controller):
  - The TimesheetController validates Tutorial deliveryHours must be exactly 1.0h at the quote/create boundary. Invalid inputs produce a 400 with a problem+json body so clients receive immediate, actionable feedback.

- DDD layering of rules:
  - Controller: thin validation and orchestration. It validates clear, user-facing constraints (e.g., Tutorial deliveryHours == 1.0) and delegates business policy to the application/service layer.
  - Application/Service: TimesheetApplicationService composes domain logic and data access. It enforces the Repeat Tutorial 7‑day window rule during create by querying recent tutorials (course-scoped) and comparing dates using a Schedule1PolicyProvider repeat window.
  - Domain/Policy/Calculator: Schedule1Calculator encapsulates EA mapping logic (TU1/TU2/TU3/TU4, AO1/AO2, DE1/DE2, Marking hourly rules) and produces consistent outputs referenced by both quote and create.

- Error format for clients:
  - All errors conform to RFC 7807 problem+json. Authentication failures and validation errors return a structured application/problem+json payload with fields such as type, title, status, detail, and a traceId when available. This was unified via a JsonAuthenticationEntryPoint and GlobalExceptionHandler.


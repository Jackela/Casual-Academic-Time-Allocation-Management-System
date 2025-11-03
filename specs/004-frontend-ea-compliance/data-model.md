# Data Model: Frontend EA Compliance Wiring

## Entities

### Timesheet (reference from backend API)
- id: number
- tutorId: number
- courseId: number
- status: enum (DRAFT, PENDING_TUTOR_CONFIRMATION, TUTOR_CONFIRMED, LECTURER_CONFIRMED, FINAL_CONFIRMED, REJECTED, MODIFICATION_REQUESTED)
- hours: number
- hourlyRate: number
- description: string
- weekStartDate: string (ISO)
- sessionDate: string (ISO)

### ApprovalEvent (for audit history rendering)
- timesheetId: number
- actorId: number
- actorRole: enum (TUTOR, LECTURER, ADMIN, HR)
- action: enum (TUTOR_CONFIRM, LECTURER_CONFIRM, HR_CONFIRM, REJECT, REQUEST_MODIFICATION)
- comment: string | null
- timestamp: string (ISO)

## Relations
- Timesheet 1..* ApprovalEvent (chronological)

## State Transitions (frontend rendering perspective)
- DRAFT → (confirm) → PENDING_TUTOR_CONFIRMATION/TUTOR_CONFIRMED (per backend)
- TUTOR_CONFIRMED → LECTURER_CONFIRMED → FINAL_CONFIRMED
- Any → REJECTED / MODIFICATION_REQUESTED (as per approval actions)

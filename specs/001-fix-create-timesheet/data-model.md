# Data Model: Create Timesheet

## Entities

- TimesheetDraft
  - tutorId: number (required)
  - courseId: number (required)
  - taskType: string (required; EA category)
  - qualification: string (required)
  - isRepeat: boolean (required)
  - sessionDate: date (required)
  - deliveryHours: number (required; may become read‑only per quote)

- QuoteResult
  - sessionDate: date
  - rateCode: string
  - qualification: string
  - associatedHours: number
  - payableHours: number
  - mandatesDeliveryHours: boolean (if true, deliveryHours must equal payable or policy value)
  - readonlyDeliveryHours: boolean
  - message: string (policy/clause summary)

- Assignments
  - tutorIds: number[]
  - courseIds: number[]

## Relationships

- Lecturer → Assignments → (Tutor, Course)
- TimesheetDraft references (Tutor, Course)
- QuoteResult is derived from TimesheetDraft (immutable snapshot used for submit gating)

## Identity & Constraints

- TimesheetDraft is client‑side transient until created; server assigns id on create
- Critical fields for quote validity: taskType, deliveryHours, qualification, isRepeat, sessionDate
- Quote remains valid until any critical field changes

## State Transitions (simplified)

- DRAFT (client) → QUOTED (client) → CREATED (server: PENDING_TUTOR_CONFIRMATION)

## Validation Rules

- tutorId, courseId must be within lecturer Assignments
- deliveryHours numeric and within EA bounds; may be locked per quote
- sessionDate valid academic calendar date per policy


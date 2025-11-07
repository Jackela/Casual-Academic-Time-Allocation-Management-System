# Timesheet Domain Model

## Aggregate Overview
The `Timesheet` entity is the primary aggregate responsible for storing tutor submissions and calculator outputs.

| Field | Type | Description |
|-------|------|-------------|
| `taskType` | `TimesheetTaskType` | Enum representing LECTURE, TUTORIAL, ORAA, DEMO, MARKING, etc. |
| `qualification` | `TutorQualification` | STANDARD, COORDINATOR, PHD. |
| `repeat` | `boolean` | Indicates repeat session within seven days. |
| `deliveryHours` | `BigDecimal` | Raw tutor-entered delivery time. |
| `associatedHours` | `BigDecimal` | Computed by `Schedule1Calculator`. |
| `payableHours` | `BigDecimal` | Delivery + associated hours after rule caps. |
| `hourlyRate` | `BigDecimal` | Rate per payable hour derived from policy tables. |
| `amount` | `BigDecimal` | Total payable amount. |
| `rateCode` | `String` | EA Schedule 1 code (e.g., TU1). |
| `formula` | `String` | Human-readable breakdown for UI transparency. |
| `clauseReference` | `String` | Clause identifier from the EA. |

`Timesheet` retains approval status transitions via `ApprovalStatus` and references to tutor/course IDs.

## Calculation Flow
1. Application service receives minimal input payload.
2. `Schedule1PolicyProvider` resolves the applicable rate data for the session date and task type.
3. `Schedule1Calculator` produces associated hours, payable hours, hourly rate, amount, formula, and clause.
4. Entity is updated with new values and persisted.

## Enumerations
- `TimesheetTaskType` ? includes new values required for EA Schedule 1 alignment.
- `TutorQualification` ? maps to Standard, Coordinator, and PhD bands used in migrations.

## Persistence Notes
- JPA entity includes `@Enumerated(EnumType.STRING)` for new enums.
- Numeric columns use scale/precision to preserve cents.
- Additional indexes on `rate_code` and `rate_version` facilitate reporting.

## Related Artifacts
- `src/main/java/com/usyd/catams/entity/Timesheet.java`
- `src/test/java/com/usyd/catams/entity/TimesheetTest.java`
- `docs/backend/data-model.md`
- `docs/backend/api-timesheets.md`

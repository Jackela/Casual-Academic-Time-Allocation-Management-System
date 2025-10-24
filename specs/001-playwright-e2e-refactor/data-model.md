# Data Model: Refactor CATAMS Playwright E2E

## Entities

### Timesheet
- Fields: id, lecturerId, tutorId, courseId, taskType, qualification, repeatFlag, deliveryHours, notes, status, serverCalculated: { associatedHours, payableHours, hourlyRate, total, rateCode, rateVersion, formula, clauseReference }
- Relationships: belongs to Lecturer; optionally associated with Tutor
- Validation: instructional inputs required; financial fields server-only
- State: Draft → Tutor Confirmed → Lecturer Approved → Admin Approved; Needs Modification; Rejected

### User
- Fields: id, email, role (Tutor|Lecturer|Admin), active
- Validation: password policy on creation (min 8; 1 upper/lower/digit/special)

### Approval
- Fields: id, timesheetId, actorRole, action (confirm|approve|reject|request-modification), reason, timestamp
- Rules: Admin approval requires prior Lecturer approval

### Notification
- Fields: id, userId, type (banner|badge), timesheetId, message, createdAt, read
- Rules: Shown as in-app banner and status badge in dashboard contexts

### AdminAction
- Fields: id, userId, action (create|activate|deactivate), performedBy, timestamp, outcome

## State Transitions
- Draft → Tutor Confirmed (by Tutor)
- Tutor Confirmed → Lecturer Approved (by Lecturer)
- Lecturer Approved → Admin Approved (by Admin)
- Any active → Needs Modification (by Lecturer/Admin with reason)
- Any active → Rejected (by Admin with reason)
- Constraint: Admin Approved requires prior Lecturer Approved

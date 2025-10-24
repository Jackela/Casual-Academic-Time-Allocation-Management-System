# Authorization Guide

This guide documents the Timesheet permission policies that gate access in the EA-compliant CATAMS backend.

## Roles

| Role | Description | Key Capabilities |
|------|-------------|------------------|
| TUTOR | Casual academic submitting hours | Request quotes, edit returned drafts, confirm or respond to approvals for their own timesheets |
| LECTURER | Unit coordinator | Create timesheets for tutors they coordinate, review/approve tutor submissions, view course-level reports |
| ADMIN | Faculty operations team | Create timesheets on behalf of any tutor, manage courses and users, override approvals |

Authentication is handled by Spring Security with JWT tokens. Authorization decisions are delegated to policy classes.

## TimesheetPermissionPolicy

`TimesheetPermissionPolicy` centralises authorization checks for create, read, update, and approval workflows. It accepts the authenticated principal and the target timesheet (or request payload) and returns boolean decisions.

### Key Methods
- `canCreateTimesheet(principal, payload)` ? Only users with `ADMIN` or `LECTURER` roles can initiate creation. Tutor users must escalate to their course coordinator.
- `canUpdateTimesheet(principal, timesheet)` ? Tutors can edit while status is draft or returned; admins can edit until final approval; lecturers cannot modify financial fields.
- `canApproveTimesheet(principal, timesheet)` ? Lecturers approve tutor submissions for their courses; admins can finalise.
- `canViewTimesheet(principal, timesheet)` ? Tutors limited to their own records; lecturers restricted to courses they coordinate; admins unrestricted.

The calculator policy is enforced separately (see `docs/policy/timesheet-ssot.md`). Even if a user is authorized to update a record, they cannot alter calculated values.

> **API enforcement:** `TimesheetController#createTimesheet` is annotated with `@PreAuthorize("hasAnyRole('ADMIN','LECTURER')")`, ensuring HTTP clients authenticated as tutors will receive `403 Forbidden` when attempting to create a timesheet.

## Usage Pattern

Controllers and services inject the policy and guard operations explicitly:

```java
if (!timesheetPermissionPolicy.canUpdateTimesheet(principal, timesheet)) {
    throw new AccessDeniedException("User cannot update timesheet " + timesheet.getId());
}
```

Policy evaluations occur before invoking `Schedule1Calculator` so unauthorized changes are rejected without touching financial logic.

## Testing

- Unit-test policy methods with representative principals (tutor, lecturer, admin) and fixture timesheets.
- Integration tests should assert that unauthorized clients receive HTTP 403 responses for create, update, and approval endpoints.
- Playwright E2E specs verify that restricted actions are hidden in the UI based on role.

## Extending Policies

When new actions are introduced (e.g., exporting reports), add explicit methods to the policy and cover them with tests. Keep decisions deterministic and side-effect free.

## Related Documents

- `docs/backend/development-guide.md`
- `docs/policy/timesheet-ssot.md`
- `docs/frontend/ux-spec.md`

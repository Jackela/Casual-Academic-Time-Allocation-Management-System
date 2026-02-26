# User Guide

Role-specific instructions for using CATAMS after the Schedule 1 refactor.

## Tutors

### Creating a Timesheet
1. Navigate to **My Timesheets** and click **Create**.
2. Enter course, task type, qualification, repeat flag, session date, and delivery hours.
3. Wait for the calculation summary to appear. The backend quote provides associated hours, payable hours, hourly rate, total amount, and the EA clause used.
4. Review the read-only totals; if they look incorrect, contact the coordinator rather than editing locally.
5. Add optional notes and submit. The backend will recompute before saving and return the official totals.
6. For **ORAA** or **Tutorial** tasks, the hourly rate is chosen automatically:
   - Tutors with `qualification = PHD` (or coordinator duty) receive `TU1` for Tutorials and `AO1_DE1` for ORAA.
   - Others receive `TU2` or `AO2_DE2` respectively.

### Editing a Returned Timesheet
- Adjust the instructional fields (delivery hours, repeat flag, etc.).
- A new quote is fetched automatically; submit once you agree with the totals.

## Lecturers

- Approve or return submissions from your course list. Financial fields are locked and shown for transparency.
- Use the clause reference to verify the EA logic and communicate with tutors if questions arise.

## Admins

- Create timesheets on behalf of tutors when required; the same quote workflow applies.
- Review rate codes and policy versions when auditing payments. All values come from the backend SSOT.

## FAQ

**Can I change the hourly rate manually?** No. All financial values are produced by the backend calculator.

**What if the rate looks wrong?** Gather the quote details (rate code, version, clause reference) and escalate to the operations team; do not override the amount in the UI.

**Do quotes expire?** Quotes are valid only for the current form state. If you change any input, a new quote is requested automatically.

## Related Documents
- `docs/policy/timesheet-ssot.md`
- `docs/backend/api-timesheets.md`
- `docs/frontend/ux-spec.md`
- `docs/ops/billing-sop.md`

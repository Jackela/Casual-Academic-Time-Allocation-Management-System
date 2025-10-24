# Missing TestIDs — Resolution Log

Purpose: Track required `data-testid` sentinels and their resolution to keep E2E selectors deterministic and SPA‑safe.

Resolved in this refactor:
- Dashboard shell: `app-ready`, `dashboard-nav`, `dashboard-main` — verified present (no change required).
- Admin Pending Review scope: `admin-pending-review` — verified present.
- Timesheet table scope: `timesheets-table` — used for scoped queries inside admin pending region.
- Admin approval error surface: `approval-error-banner` — verified present; used as UI oracle for 409.
- Lecturer create entry: `lecturer-create-entry`, `lecturer-create-open-btn` — verified present.
- Lecturer modal: `lecturer-create-modal` — verified present.
- Lecturer form fields: `create-course-select`, `create-delivery-hours-input`, `create-description-input` — verified present.
- Calculated preview sentinel: `calculated-preview` — verified present and used to gate quote readiness.

Open/Deferred:
- None required for P0. Any future gaps should follow the pattern: add route‑level sentinel and scope table/page object queries under it.


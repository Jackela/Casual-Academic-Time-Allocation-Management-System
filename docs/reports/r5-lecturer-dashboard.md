R5 — Lecturer Dashboard Implementation Report

Frontend

- Main components:
  - LecturerDashboardShell — page container that manages loading/ready states, mounts the always-present Create Timesheet modal anchor for stability, and hosts the main panels.
  - LecturerTimesheetCreateModal — lecturer-facing creation form using the same TimesheetForm with E2E anchors and Calculated Pay Summary.
  - LecturerPendingTable — tabular view of pending tutor submissions requiring lecturer action.
  - FiltersPanel / Header — quick filters for course/date/status, and page-level summary actions.

- Data visualization (hours by tutor):
  - The dashboard summarises total delivery/payable hours by tutor for the selected course and period. It renders compact cards or a summarized table for “hours by tutor,” enabling quick spot checks.

- Budget tracking:
  - The UI shows Used vs Remaining budget for the selected course/time window and displays “total hours within budget.” When provided, a progress indicator communicates budget health (e.g., green within threshold, amber near threshold).

Backend

- Aggregation API endpoint:
  - GET /api/lecturer/dashboard-summary?courseId={id}&from={yyyy-mm-dd}&to={yyyy-mm-dd}
  - Returns: per-tutor hour/amount tallies, course budget figures (total budget, used, remaining), and status distribution for the period.

- Data aggregation strategy:
  - The service layer issues targeted aggregation queries (e.g., SUM over payableHours and amounts GROUP BY tutor, filtered by courseId and date range). Some calculations (e.g., rounding, formatting) are done in service to keep SQL portable and the payload concise.

- Budget model:
  - Budget is modelled per course (e.g., total monetary budget or target payable hours). The summary computes used/remaining by subtracting period totals from the configured budget. Where a course lacks a configured budget, the API returns null/0 with clear fields so the UI can render a “no budget configured” hint rather than error.


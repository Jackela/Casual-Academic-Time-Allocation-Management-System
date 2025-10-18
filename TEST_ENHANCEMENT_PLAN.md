# Test Enhancement Plan – EA Compliance E2E Coverage

## Objective
Document the Enterprise Agreement (EA) Schedule 1 billing gaps that remain untested in `frontend/e2e/real/workflows/` and prescribe the end-to-end (E2E) scenarios required to achieve P0 compliance coverage. The plan focuses on rate-code selection, qualification handling, repeat logic, associated-hour caps, and UI transparency for calculator outputs.

## Current Workflow Coverage
| Spec file | Scenario focus | EA Schedule 1 coverage |
| --- | --- | --- |
| `admin-final-approval.spec.ts` | HR finalises a lecturer-confirmed timesheet via API | None – only status transition assertions |
| `admin-user-management.spec.ts` | Admin creates a tutor account | None – user provisioning only |
| `critical-user-journeys.spec.ts` | Lecturer dashboard load and cross-role approval lifecycle | None – verifies lifecycle status changes without inspecting calculator data |
| `tutor-uat.spec.ts` | Tutor submits draft timesheet | None – no quote request or rate assertions |
| `visual-workflow-audit.spec.ts` | Screenshot audit of lifecycle | None – no billing validations despite capturing UI |

**Finding:** The existing suite exercises approvals and navigation flows but never opens the Timesheet form or asserts calculator artefacts (rate code, associated hours, formula, warnings). All P0 billing rules remain uncovered.

## P0 Business Rules Requiring E2E Validation
- Rate-code determination across Schedule 1: P01–P04 (lectures), TU1–TU4 (tutorials & repeats), AO1/AO2 (ORAA), DE1/DE2 (Demonstrations), M03–M05 (Marking).
- Qualification permutations (PhD, Coordinator, Standard) drive tutorial/ORAA rate selection.
- Repeat logic: repeat tutorials/lectures within a 7-day window pick TU3/TU4 (or repeat lecture caps) and cap associated hours at 1; outside the window the calculator must reject repeat hints.
- Associated-hour and payable-hour caps enforced per task type with visible warnings when inputs exceed policy limits.
- Marking payments only payable when non-contemporaneous; contemporaneous marking must zero out and warn.
- ORAA/Demonstration sessions remain hourly with zero associated hours while allowing stacking without double counting.
- Rate version boundaries (policy effective dates) ensure correct yearly amount selection.
- Error handling: zero delivery hours rejected; repeat outside window returns 409; calculator warnings surfaced in UI.
- UI transparency: `rateCode`, `qualification`, `associatedHours`, `payableHours`, `hourlyRate`, `amount`, `formula`, `clauseReference`, and `warnings` rendered for auditors.

## Gap Analysis & Required Scenarios

### Tutorials (TU1–TU4) & Repeat Controls
Current gap: No test covers tutorial rate-code selection, qualification permutations, repeat eligibility, or associated-hour caps.

| Scenario ID | Focus | Key assertions |
| --- | --- | --- |
| `TC-TUT-01` | Standard tutorial with PhD-qualified tutor (non-repeat) | UI quote shows `rateCode=TU1`, `associatedHours=2.0`, `qualification=PHD`, correct hourly amount for current policy year, formula matches delivery + 2h associated |
| `TC-TUT-02` | Standard tutorial with standard tutor | `rateCode=TU2`, `associatedHours=2.0`, qualification rendered as `STANDARD`, totals match backend |
| `TC-TUT-03` | Repeat tutorial within 6 days for PhD tutor | Pre-seed prior session, expect `rateCode=TU3`, `isRepeat=true`, `associatedHours=1.0`, warning about repeat cap where provided |
| `TC-TUT-04` | Repeat tutorial within 6 days for standard tutor | Expect `rateCode=TU4`, `associatedHours=1.0`, payable hours updated |
| `TC-TUT-05` | Repeat hint outside 7-day window | Backend returns 409 or `isRepeat=false`; UI shows validation error and prevents submit, ensuring no TU3/TU4 upgrade |
| `TC-TUT-06` | Associated hours request > policy cap | Enter manual hours above cap; ensure UI truncates to policy cap, displays warning, and keeps rate code stable |

### Lectures (P01–P04) & Associated-Hour Bands
Current gap: No verification that lecture variants cap associated hours (4/3/2/1) or switch repeat behaviour.

| Scenario ID | Focus | Key assertions |
| --- | --- | --- |
| `TC-LEC-01` | Visiting scholar lecture (P01) | `rateCode=P01`, associated hours capped at 4, clause reference rendered |
| `TC-LEC-02` | Standard lecture (P02) | `associatedHours=2`, amount matches schedule |
| `TC-LEC-03` | Developed/significant lecture (P03) | `associatedHours=3`, formula shows correct breakdown |
| `TC-LEC-04` | Repeat lecture within 7 days | rate downgraded to repeat variant (P04 if policy uses repeat code) with `associatedHours=1` and repeat warning |
| `TC-LEC-05` | Repeat lecture outside window | Repeat hint rejected, falls back to base code with explanatory error |

### ORAA (AO1/AO2) & Demonstrations (DE1/DE2)
Current gap: No validation that hourly tasks remain zero-associated and respect qualification mapping.

| Scenario ID | Focus | Key assertions |
| --- | --- | --- |
| `TC-ORAA-01` | ORAA for PhD/Coordinator tutor | Expect `rateCode=AO1`, `associatedHours=0`, qualification = `PHD`/`COORDINATOR`, amount = deliveryHours × hourlyAmount |
| `TC-ORAA-02` | ORAA for Standard tutor | `rateCode=AO2`, same zero associated hours |
| `TC-DEMO-01` | Demonstration for PhD tutor | `rateCode=DE1`, zero associated hours |
| `TC-DEMO-02` | Demonstration for Standard tutor | `rateCode=DE2`, zero associated hours |
| `TC-ORAA-03` | Tutorial + ORAA same day | Ensure ORAA quote does not double count associated hours, warning displayed if policy triggers manual override requirement |

### Marking (M03–M05) & Double-Counting Controls
Current gap: No E2E ensures contemporaneous marking is zeroed out or that non-contemporaneous entries pay correctly.

| Scenario ID | Focus | Key assertions |
| --- | --- | --- |
| `TC-MRK-01` | Non-contemporaneous marking (manual override) | Create marking entry on different day; expect `rateCode=M03/M04/M05` (depending on qualification), positive amount, formula logged |
| `TC-MRK-02` | Marking flagged contemporaneous with tutorial | Calculator zeros amount, returns warning that contemporaneous marking is disallowed |
| `TC-MRK-03` | Manual associated hours attempt on marking | UI prevents/zeros associated hours, leaving hourly totals consistent |

### Rate-Version Boundaries & Policy Changes
Current gap: No regression around policy effective dates or version metadata.

| Scenario ID | Focus | Key assertions |
| --- | --- | --- |
| `TC-RATE-01` | Tutorial dated before annual rate change | Quote uses previous year’s hourly amount; `rateVersion` details surfaced |
| `TC-RATE-02` | Tutorial dated after rate change | Hourly amount advances to new policy year |
| `TC-RATE-03` | Audit policy version display | UI shows `eaReference` or clause reference from quote payload matching backend |

### Error Handling, Warnings, and UI Transparency
Current gap: UI warnings and errors from calculator never asserted.

| Scenario ID | Focus | Key assertions |
| --- | --- | --- |
| `TC-ERR-01` | Zero delivery hours submission | Quote fails validation, UI shows error and disables submit |
| `TC-ERR-02` | Backend 409 propagation (repeat outside window) | Error banner renders backend message, no stale quote retained |
| `TC-ERR-03` | Formula and warning display | For any scenario with warnings (repeat cap, zeroed marking), assert warning text, formula, and clause copy appear |
| `TC-ERR-04` | Quote retry resilience | Simulate network abort, ensure retry fetches updated quote before submission |

## Implementation Notes
- **Extend test data factory:** Enhance `createTimesheetForTest` (or add helper) to seed historical sessions with specific `taskType`, `sessionDate`, `qualification`, and rate hints so repeat and marking scenarios have prerequisite data without manual DB access.
- **Add Timesheet form page object:** Introduce a dedicated helper to interact with `TimesheetForm` fields (`taskType`, `qualification`, `isRepeat`, date pickers) and to read quote summary tiles (rate code, associated hours, warnings, formula).
- **Quote interception utilities:** Wrap Playwright `page.waitForResponse` around `/api/timesheets/quote` to capture payloads for deep assertions and to verify request parameters (e.g., repeat flag, qualification).
- **Environment toggles:** Ensure seeds run with deterministic Monday dates to avoid weekend validation failures; consider using `E2E_CONFIG.TEST_WEEK_START` if available.
- **Traceability:** Annotate each new spec with comments linking back to EA_COMPLIANCE_PLAN.md sections (1.3 for rules, 4.1 for transparency), enabling auditors to trace coverage.
- **Visibility of warnings:** If UI currently lacks warning surfaces, record follow-up defects or expand the form to render `quote.warnings` before asserting them.

## Sequencing Recommendations
1. Implement tutorial scenarios (`TC-TUT-01`‒`TC-TUT-06`) first—highest business risk and unlocks repeat detection helpers used elsewhere.
2. Add lecture and ORAA/Demo coverage to span all teaching rate codes.
3. Layer marking and double-counting scenarios once repeat helpers exist.
4. Finish with rate-version boundary and error-handling cases to complete audit matrix.

Delivering these scenarios will bridge the gap between status-only workflows and the EA Schedule 1 billing obligations, ensuring the final validation phase exercises every P0 business rule in the live UX.

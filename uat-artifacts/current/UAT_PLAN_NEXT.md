# UAT Plan – CATAMS MCP Validation Run

**Author**: Codex (GPT-5)  
**Execution Window**: 2025-10-30  
**Environment Targets**: Frontend `http://localhost:5174`, Backend `http://localhost:8084`  
**Artifacts Root**: `uat-artifacts/current` (subfolders created per scenario)

## 0. Objectives & Scope
- Re-validate core CATAMS approval workflows end-to-end with real data.
- Confirm previously logged gaps (ISSUE-008 → ISSUE-020) remain addressed or document outstanding behaviour.
- Capture console/network/a11y evidence using Chrome DevTools MCP tools only.
- Produce execution log suitable for audit of frontend/backend alignment.

## 1. Preconditions
1. Run database reset (deterministic seed):
   - `npm run e2e:reset > uat-artifacts/current/setup/reset-output.txt`
   - Capture emitted accounts and tokens.
2. Launch stack (Dockerised preferred):
   - `docker-compose up --build -d`
   - Verify health with `curl http://localhost:8084/actuator/health` and `curl http://localhost:5174` (optional).
3. Start Chrome DevTools MCP session with Chromium, ensure command channel responsive.
4. Clear previous MCP pages; each role will use its own tab to avoid auth clashes.

## 2. Evidence & Logging Standards
- **Screenshots**: `uat-artifacts/current/screens/<scenario>-<step>.png` via `mcp__chrome-devtools__take_screenshot` (use `fullPage:true` when necessary).
- **Snapshots (a11y/DOM)**: `uat-artifacts/current/snapshots/<scenario>-<step>.json` saved from `take_snapshot(verbose=true)` output.
- **Network Logs**: For each scenario export relevant entries to `uat-artifacts/current/network/<scenario>-<req>.json` using `mcp__chrome-devtools__get_network_request`.
- **Console Logs**: `mcp__chrome-devtools__list_console_messages` at start/end of each scenario, append to `uat-artifacts/current/logs/<scenario>-console.json`.
- **Result Tracking**: Populate `uat-artifacts/current/UAT_RESULTS.md` with step outcomes, referencing stored artifacts.

## 3. MCP Command Playbook
| Action | Preferred Command(s) | Notes |
|--------|----------------------|-------|
| Open role session | `mcp__chrome-devtools__new_page({url})` | One tab per role (Tutor, Lecturer, Admin) |
| Switch tab | `mcp__chrome-devtools__select_page({pageIdx})` | Maintain index map in run notes |
| Discover elements | `mcp__chrome-devtools__take_snapshot({verbose:true})` | Extract UIDs for subsequent actions |
| Fill inputs | `mcp__chrome-devtools__fill` / `fill_form` | For select menus use snapshot UID for option |
| Trigger buttons/links | `mcp__chrome-devtools__click` | Set `dblClick:true` if needed |
| Await DOM text | `mcp__chrome-devtools__wait_for({text})` | Validate navigation or state change |
| Inspect network | `mcp__chrome-devtools__list_network_requests`, `get_network_request` | Run before/after key actions |
| Evaluate backend | `mcp__chrome-devtools__evaluate_script` | Use stored JWT to fetch protected APIs |
| Performance sampling | `mcp__chrome-devtools__performance_start_trace`, `performance_analyze_insight` | Optional for dashboard refresh |

## 4. Scenario Matrix

### Scenario 1 – Lecturer Timesheet Creation & Quote SSOT (ISSUE-012/018/017)
**Goal**: Validate quote endpoint constraints, ensure create request excludes financial fields, check Monday enforcement.  
**Setup**: Lecturer tab (Page 0) logged in, baseline network/console cleared.  
**Steps**:
1. Open “Create Timesheet” modal; capture snapshot before inputs.
2. Exercise delivery hours at boundary values (0.05, 0.1, 10.0, 10.1) observing client validation.
3. Submit valid quote (0.1h) and capture `/api/timesheets/quote` request/response.
4. Attempt non-Monday week start; capture UI/server response.
5. Submit valid timesheet (Monday) and confirm auto-submit action.
**Acceptance**:
- Client prevents invalid hours; only valid request reaches backend.
- Quote response includes rateCode/hourlyRate/payableHours; request body lacks financial fields.
- Create endpoint returns 201; auto-submit transitions to PENDING_TUTOR_CONFIRMATION.
- Monday enforcement consistent (UI and server).  
**Evidence**: Screenshots (`S1-form`, `S1-quote`, `S1-success`), network JSON (`S1-quote`, `S1-create`, `S1-submit`), console logs.

### Scenario 2 – Tutor Confirmation & Dashboard Freshness (ISSUE-009)
**Goal**: Ensure tutor can confirm pending item and dashboards refresh on focus ≤1s; polling every ~30s without duplication.  
**Setup**: Tutor tab (Page 1) logged in; Lecturer tab kept open for focus swap.  
**Steps**:
1. Record dashboard counts before action.
2. Confirm timesheet via button; capture approval request.
3. Immediately switch to Lecturer tab, log time between focus and refreshed counts.
4. Keep Lecturer dashboard visible for 2 minutes; record network intervals and ensure single polling schedule.
**Acceptance**:
- `POST /api/approvals` action `TUTOR_CONFIRM` → 200.  
- Lecturer dashboard updates ≤1s after focus.  
- Polling occurs once every ~30s; no request storms.  
**Evidence**: Screens (`S2-tutor-before`, `S2-tutor-after`, `S2-lecturer-refresh`), network timing table, console logs.

### Scenario 3 – Lecturer Approval Progression
**Goal**: Validate lecturer approval path and dashboard counters after tutor confirmation.  
**Steps**:
1. Approve the tutor-confirmed entry; capture `LECTURER_CONFIRM` request.  
2. Confirm status badge updates and counts adjust.  
3. Record console/network logs post-action.  
**Acceptance**: 200 OK with `action=LECTURER_CONFIRM`; UI reflects LECTURER_CONFIRMED state.  
**Evidence**: Screenshots, network JSON, console log.

### Scenario 4 – Admin Final Approval & Audit Trail Integrity
**Goal**: Validate final approval and audit history.  
**Steps**:
1. In Admin tab (Page 2), approve lecturer-confirmed timesheet; capture `HR_CONFIRM`.  
2. Open approval history/audit view; capture DOM snapshot.  
3. Use admin token with `evaluate_script` to GET `/api/approvals/history/{id}` and save response.  
**Acceptance**: Final status `FINAL_CONFIRMED`; audit history includes each transition with actor/timestamp/comment.  
**Evidence**: Screens (`S4-admin-action`, `S4-audit`), network JSON (`S4-hr-confirm`, `S4-audit-api`).  

### Scenario 5 – Rejection Workflow Regression
**Goal**: Confirm rejection retains reason, blocks further approvals.  
**Steps**:
1. Create new timesheet (Scenario 1 steps abbreviated).  
2. Tutor confirms; Lecturer rejects with comment “Hours incorrect”.  
3. Tutor view shows rejection banner, no confirm button.  
**Acceptance**: `REJECT` action 200; tutor UI displays message, item locked.  
**Evidence**: Screens, network JSON, console logs for both roles.

### Scenario 6 – Modification Request Loop
**Goal**: Validate REQUEST_MODIFICATION path, tutor re-edit, and final completion.  
**Steps**:
1. Create/confirm new timesheet.  
2. Lecturer issues modification request with reason.  
3. Tutor edits description, resubmits (quote + create + auto-submit).  
4. Complete approvals through lecturer/admin again.  
**Acceptance**: Status transitions: `TUTOR_CONFIRMED → MODIFICATION_REQUESTED → PENDING_TUTOR_CONFIRMATION → … → FINAL_CONFIRMED`.  
**Evidence**: Snapshots of editable form, network logs for modification action, resubmission, final approvals.

### Scenario 7 – Admin Tutor Creation Gaps (ISSUE-014/015)
**Goal**: Document current behaviour for course binding and default qualification.  
**Steps**:
1. Admin → Users → Create Tutor; attempt multi-course selection (capture UI).  
2. Submit tutor; capture payload (expect missing course/qualification).  
3. Login as new tutor; verify dashboards show unrestricted courses, qualification defaults absent.  
**Acceptance**: If gaps persist, record as OPEN with evidence; if resolved, note behaviour.  
**Evidence**: Screenshots of creation form, network payload, tutor dashboard.

### Scenario 8 – Config & Constraint Publication (ISSUE-016/017/018/020/019)
**Goal**: Assess support endpoints and parameter handling.  
**Steps**:
1. Trigger dashboard sorts; inspect requests (`sortBy` vs `sort`).  
2. Call `/api/timesheets/config` via `evaluate_script`; record response or 404.  
3. Attempt POST `/api/timesheets` with tutor role (should 403).  
4. Review `uat-helpers.sh` output (`./uat-helpers.sh --dry-run approve ...`) for payload format (record).  
5. Inspect timesheet detail JSON to confirm `hours` semantics.  
**Acceptance**: Document actual behaviour; highlight mismatches.  
**Evidence**: Network logs, command outputs, notes.

### Scenario 9 – Credential SSOT Verification (ISSUE-008)
**Goal**: Ensure credentials from reset manifest align with login behaviour.  
**Steps**:
1. Compare `reset-output.txt` accounts with actual login success.  
2. Attempt invalid credentials; confirm 401 and user-facing error message.  
3. Record console errors (if any).  
**Evidence**: Login screenshots, console logs, manifest snippet.

### Scenario 10 – Resilience & Offline Handling
**Goal**: Validate UI responses to network interruption and measure dashboard performance.  
**Steps**:
1. Start performance trace during dashboard refresh; analyse insight.  
2. With modal open, set `mcp__chrome-devtools__emulate_network("Offline")`, trigger quote; observe UI messaging, then restore `No emulation`.  
**Acceptance**: UI surfaces retry/error; no silent failures.  
**Evidence**: Trace analysis output, screenshots/console logs of offline message.

## 5. Post-Execution Tasks
- Update `UAT_RESULTS.md` with per-scenario status, referencing stored artifacts.
- Append new findings to ISSUE_LOG.md manually after review (no direct code fix).  
- Share residual risks and recommended follow-up actions in run summary.

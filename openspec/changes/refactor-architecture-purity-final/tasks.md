# Tasks: Refactor Architecture Purity Final

**Change ID:** `refactor-architecture-purity-final`
**Status:** Implemented

## 1. Spec Gate

- [x] 1.1 Create proposal/design/tasks/spec deltas for architecture purity.
- [x] 1.2 Validate change with `openspec validate refactor-architecture-purity-final --strict`.

## 2. Rule Single Source Convergence

- [x] 2.1 Remove DecisionService/DecisionApplicationService business usage and hardcoded validation thresholds.
- [x] 2.2 Refactor Course application authorization to explicit policy service (no Decision module dependency).
- [x] 2.3 Ensure hours/rate/monday validation routes through `TimesheetValidationService + TimesheetValidationProperties` only.
- [x] 2.4 Refactor workflow rule registry into an injected component backed by `ApprovalStateMachine`.

## 3. Dependency Direction Purification

- [x] 3.1 Remove `ApprovalStateMachineHolder` and all static usages.
- [x] 3.2 Remove enum transition helper methods (`ApprovalStatus.canTransitionTo`, `ApprovalAction.getTargetStatus`).
- [x] 3.3 Keep transition validation in domain/application orchestration, not static bridges.

## 4. Boundary Purification

- [x] 4.1 Remove repository and business decision logic from controllers.
- [x] 4.2 Split timesheet service contracts into command/query/authorization interfaces.
- [x] 4.3 Reduce god-service responsibilities in timesheet application layer.
- [x] 4.4 Unify exception semantics for business-rule, authorization, and conflict failures.
- [x] 4.5 Remove swallow-and-default (`false/null/empty`) error masking on business paths.

## 5. Security Hardening

- [x] 5.1 Restrict `/api/test-data/**` to test/e2e profiles only in security config.
- [x] 5.2 Require `X-Test-Reset-Token` for test-data operations and add audit logging.
- [x] 5.3 Remove JWT filter public-path bypass for test-data routes.
- [x] 5.4 Keep CORS explicit allowlist only (no wildcard origin).

## 6. Strict Replaceability/Fail-Fast

- [x] 6.1 Remove `@Nullable`/optional-injection fallback from `Schedule1PolicyProvider`.
- [x] 6.2 Remove in-memory fallback catalogue and fallback-by-rate-code behavior.
- [x] 6.3 Ensure startup fails fast when required rate configuration is absent.

## 7. Verification

- [x] 7.1 Add ArchUnit guardrails (controller no repository dependency; domain no application/static bridge dependency).
- [x] 7.2 Add consistency tests for quote/create/update validation semantics.
- [x] 7.3 Add approval-transition parity tests (only state machine path valid).
- [x] 7.4 Add security tests for test-data route profile/token behavior.
- [x] 7.5 Pass backend tests, frontend lint/tests, and full E2E.
- [x] 7.6 Grep-gate: no `ApprovalStateMachineHolder`, no Decision module business usage, no hardcoded `40.0/100.00` thresholds in runtime code.

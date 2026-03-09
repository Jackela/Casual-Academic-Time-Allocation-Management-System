# RFC: Architecture Purity Remediation

Status: Proposed  
Owner: CATAMS Engineering  
Date: 2026-03-06

## 1. Context

CATAMS currently contains duplicated workflow logic, mixed-layer responsibilities, and permissive security defaults that reduce maintainability and create drift risk.  
This RFC defines a full remediation baseline focused on rule single-source-of-truth, boundary purity, and safer defaults.

## 2. Decisions

1. Approval workflow transitions have exactly one source of truth: `ApprovalStateMachine`.
2. Validation thresholds and business validation entry points are owned by domain validation services.
3. Controllers are protocol adapters only and do not execute domain decisions or direct repository calls.
4. Application services orchestrate use-cases and transactions but do not duplicate core domain rules.
5. Security defaults are strict: explicit CORS allowlist and test-data endpoints constrained to test/e2e profiles with token checks.
6. Extensibility direction for Schedule 1 calculator is strategy registration by task type, replacing monolithic branching.

## 3. Non-Goals

1. No attempt to preserve deprecated duplicate transition APIs for compatibility.
2. No partial migration that leaves dual rule engines active.
3. No soft-only warnings for security misconfiguration; insecure defaults must be removed.

## 4. Target Architecture

1. Workflow transition checks and next-status resolution delegate to `ApprovalStateMachine`.
2. Entity methods can invoke transition guards, but transition definitions must not live in enums or static fallback maps.
3. Domain validation is centralized in domain services; entity-level static global lookups are removed.
4. Controller validation is limited to transport-level shape validation. Business policy checks move to application/domain services.
5. Service contracts are split by responsibility (command/query/authorization helpers) instead of broad kitchen-sink interfaces.

## 5. Risk and Mitigation

1. Breaking changes in transition APIs may fail tests.  
Mitigation: migrate all call sites in one branch and update tests in the same change set.
2. Tightened security may break local test tooling.  
Mitigation: keep test/e2e profiles and tokenized test-data endpoints explicit and documented.
3. Service interface split can cause broad compile failures.  
Mitigation: do staged refactor with temporary adapters removed at the end.

## 6. Acceptance Criteria

1. No duplicated transition rules outside `ApprovalStateMachine`.
2. No entity static validation global access paths (`ValidationSSOT`, static setter injection).
3. No controller direct repository calls for business decisions.
4. CORS uses explicit configured origins only; no wildcard-with-credentials.
5. Test-data endpoints are inaccessible outside test/e2e profiles.
6. Full backend tests, frontend tests, and E2E suites pass.

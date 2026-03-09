# Proposal: Refactor Architecture Purity Final

**Change ID:** `refactor-architecture-purity-final`
**Status:** Proposed
**Created:** 2026-03-08
**Author:** Codex

## Why

Current implementation is functionally stable but not architecture-pure: duplicated rule sources, static cross-layer bridges, controller business logic, permissive fallback strategies, and mixed error semantics. This increases drift risk under AI-assisted high-velocity changes.

## What Changes

- Remove Decision engine business path and consolidate validation/authorization to existing SSOT services.
- Remove `ApprovalStateMachineHolder` static bridge and enum transition helpers.
- Convert workflow rules to injected component using `ApprovalStateMachine` as the only transition source.
- Thin controllers to protocol adaptation only; move business decisions into application/domain services.
- Split overloaded timesheet service contracts into command/query/authorization boundaries.
- Harden security defaults for `/api/test-data/**` (test/e2e profile + token only).
- Enforce strict `Schedule1PolicyProvider` dependency/configuration (fail fast, no runtime fallback).
- Normalize business/authorization/conflict exception semantics.
- Add architecture guardrails and consistency/security regression tests.

## Impact

- Affected specs: `architecture-purity`
- Affected code:
  - workflow and approval stack
  - timesheet application/controller contracts
  - security and test-data endpoint policy
  - schedule1 policy provider
  - test suites (unit/integration/arch)

## Breaking Notes

- Internal interfaces will change (Decision module removal, service contract split, enum helper removal).
- HTTP paths are intended to remain stable; some error mapping semantics become stricter and more consistent.

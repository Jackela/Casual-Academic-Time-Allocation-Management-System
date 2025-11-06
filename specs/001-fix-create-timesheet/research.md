# Research: Create Timesheet UI Unblock & Quote‑Then‑Create Alignment

## Decisions

- Decision: Mount modal consistently and wire Create button in all states
  - Rationale: Eliminates loading‑state dead button and ensures a11y behaviors are testable.
  - Alternatives: Conditionally mount only when loaded (rejected: causes flakiness, blocks a11y tests).

- Decision: Quote remains valid until any critical field changes (no time expiry)
  - Rationale: Simple mental model; avoids hidden timeouts; reinforced in FR‑006.
  - Alternatives: 5‑minute expiry or page‑lifetime validity (rejected: surprises or stale quotes).

- Decision: Debounce quote (~300ms) with inflight cancellation
  - Rationale: Prevents race conditions and reduces server load; ensures last input wins.
  - Alternatives: No debounce (rejected: excessive calls, race risks).

- Decision: Error mapping (403 guidance; 400 VALIDATION_FAILED → field‑level + focus)
  - Rationale: Actionable feedback improves success and reduces support load.
  - Alternatives: Generic banners (rejected: poor UX, ambiguous).

- Decision: Telemetry of quote latency and create outcomes (non‑PII)
  - Rationale: Observability for performance and incident triage.
  - Alternatives: None (rejected: blind to regressions).

- Decision: e2e‑local seeding and short‑circuit for tutor assignments
  - Rationale: Deterministic E2E, bypass data drift; supports Docker runner ownership of backend.
  - Alternatives: Rely on prod‑like DB seed only (rejected: brittle, slow, inconsistent).

- Decision: Consolidated EA rate/policy seed behind test profiles
  - Rationale: Create/Quote specs depend on EA policy/rate data; seeding ensures consistent quote behavior.
  - Alternatives: On‑demand ad‑hoc inserts (rejected: non‑deterministic and hard to maintain).

## Clarifications Resolved

- Quote validity: Until any critical field changes (no time‑based expiry).

## Open Questions

- Backend rate/policy seed scope sufficient for all existing E2E specs? (align with EA billing tests)

## Alternatives Considered (Summary)

- Time‑based quote validity windows
- Always‑on modal mounting vs conditional rendering
- Server‑side enforcement only vs UI + server validation

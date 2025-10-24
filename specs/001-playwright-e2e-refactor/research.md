# Research: Refactor CATAMS Playwright E2E (frontend/e2e/real)

## Decisions

- Decision: Chromium-only for real E2E
  - Rationale: Minimizes flakiness and CI time while matching user value; cross-browser can be covered by lightweight smoke if required later.
  - Alternatives considered: Tri-browser (Chromium/Firefox/WebKit) — higher runtime and flake; Chromium+WebKit — partial increase in effort.

- Decision: Programmatic login for most flows; UI login for smoke
  - Rationale: Faster and more reliable; still validates UI login path in smoke to detect regressions.
  - Alternatives considered: All UI logins — too slow/fragile; token seeding — higher coupling to backend.

- Decision: Standardize data-testid attributes and ban brittle selectors
  - Rationale: Test stability and readability; selectors resilient to styling/structure changes.
  - Alternatives considered: CSS/XPath selectors — brittle; text selectors — localization-dependent.

- Decision: Enforce approval invariant (Admin requires Lecturer approval)
  - Rationale: Aligns workflow with governance; simplifies negative test oracle.
  - Alternatives considered: Admin override — policy risk; Unrestricted admin — bypasses control.

- Decision: Password policy for Admin user creation (min 8; 1 upper/lower/digit/special)
  - Rationale: Balanced security vs UX; easy to communicate and test.
  - Alternatives considered: 12+ chars w/ multiples — higher friction; passphrase-only — policy mismatch.

## Open Questions (Resolved)

- Cross-browser scope → Chromium-only for this suite; others deferred to smoke if needed.
- Notification surface → In-app banner + status badge.


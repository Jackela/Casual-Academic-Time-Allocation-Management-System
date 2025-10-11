# Translation Charter

## Purpose

Create a consistent, discoverable English-first knowledge base across code comments, documentation, and tooling hints. The charter prevents partial translations, stale bilingual blocks, and ambiguous context that slows contributors and CI automation.

## Translation Targets

- Repository documentation (`README.md`, `docs/**`, onboarding guides).
- In-line comments and Javadoc/KDoc.
- Script level help text and CLI usage.
- Test fixture annotations, including Playwright metadata and Karate tags.
- CI pipeline messages and human-facing logging templates.

## Style & Tone

- Prefer direct, active voice sentences. Example: “Validate payload signature before persisting.”
- Keep domain terms consistent with the shared glossary (see below).
- Use SI units, ISO dates (YYYY-MM-DD), and explicit time zones (UTC unless noted).
- Avoid idioms or colloquial phrases; choose globally understood vocabulary.
- Acronyms must be expanded on first use within each document/class.

## Glossary (Initial)

| Term | Preferred English Form | Notes |
| --- | --- | --- |
| SSOT | Single Source of Truth | Use acronym after first expansion |
| Tutor | Tutor (Casual Academic) | Clarify in context when referring to contract role |
| Lecturer | Lecturer (Approver) | Distinguish from teaching duties when necessary |
| Admin | Administration Officer | Use “Admin Officer” in role descriptions |
| Timesheet | Timesheet | Avoid “sheet” shorthand |
| Approval State Machine | ApprovalStateMachine | Class name kept in camel case |

The glossary lives in version control; propose additions via PRs touching this file to keep it authoritative.

## Working Agreement

1. **Translate while touching**: when modifying a file with legacy non-English text, bring the entire file up to this charter. Do not leave mixed-language sections.
2. **Prefer meaning over literal word swaps**: rephrase for clarity instead of direct translations that sound unnatural.
3. **Document rationale in PRs**: summarise significant language changes in commit messages or PR descriptions so reviewers see the intent quickly.
4. **Cross-review**: at least one reviewer confirms translations preserve business logic and acceptance criteria semantics.
5. **Tooling alignment**: enable spell-checkers/linters with the glossary to avoid regression (VSCode `cSpell`, IntelliJ Grazie, etc.).

## Inventory & Owners (2025-10-11)

| Asset | Status | Owner |
| --- | --- | --- |
| Core documentation (`README.md`, `PROJECT_DOCS.md`, `WORKSPACE_STRUCTURE.md`) | English-complete | Dev leads |
| Architecture docs (`docs/architecture/**`) | English-complete | Architecture guild |
| Domain Java code (`src/main/java`) | English-complete | Backend squad |
| Frontend source (`frontend/src`) | English-complete | Frontend squad |
| Test suites (`src/test/java`, `frontend/tests`, `frontend/e2e`) | English-complete | QA guild |
| Script help text (`tools/scripts/**`, `scripts/**`) | English-complete | Platform |

Future updates should append translational hotspots to this table with owner names or distribution lists.

## Validation

- `rg "[^\x00-\x7F]" -g'*.[jt]s'` and `rg "[^\x00-\x7F]" docs` run in CI to guard against regressions.
- Optional spell-check job using the glossary as allowlist.
- Playwright and Vitest snapshot names must remain in English; regenerate snapshots immediately after translating UI copy.
- Contract drift gate: `./gradlew verifyContracts` (enforced via `schema/contracts.lock`).

## Change Management

1. Update this charter when rules change.
2. Reflect significant policy updates in `docs/adr/` (Architecture Decision Records).
3. Announce in Slack `#catams-dev` and tag module owners.
4. Close related backlog items with links to commits for traceability.

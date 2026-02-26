# ADR 0001: Root Hygiene, Script Authority, and Contract-First Pipeline

- **Status:** Accepted (2025-10-11)
- **Context:** The repository accrued multiple top-level tooling directories, duplicate script entry points, and ad-hoc schema contracts. This increased cognitive load and made automation brittle.
- **Decision Maker(s):** Platform, Backend, Frontend leads

## Decision

1. Introduce `.devtools/` to house AI/assistant configurations and keep the root directory focused on source code and docs.
2. Retain `tools/scripts/` as the authoritative implementation of orchestration logic. `scripts/` remains a set of thin shims for legacy invocation only.
3. Establish `infra/` as the canonical location for deployment and IaC assets (migrating from `.bmad-infrastructure-devops/`).
4. Implement a contract-first workflow that:
   - Stores source JSON Schema documents under `schema/`.
   - Generates Java POJOs and TypeScript definitions into `build/generated-contracts/`.
   - Adds drift detection to CI via `./gradlew verifyContracts`.
5. Update documentation (README, `docs/tasks.md`, `docs/WORKSPACE_STRUCTURE.md`) to reflect the new structure and workflows.

## Rationale

- Cleaner root layout reduces onboarding time and improves developer experience.
- A single source of truth for scripts prevents divergence between `tools/` and `scripts/`.
- Contract generation ensures backend and frontend share typed models without manual duplication.
- Automation-friendly directories (e.g., `.devtools/`) keep noisy assistant artefacts out of the core workspace.

## Consequences

- Contributors must run `./gradlew generateContracts` when schemas change.
- CI pipelines need to call the new verification tasks.
- Documentation must remain aligned with the governance rules to avoid confusion.

## Follow-Up Tasks

- Migrate existing deployment scripts into `infra/`.
- Wire contract verification into GitHub Actions.
- Monitor `.gitignore` to ensure generated artefacts stay out of version control.

# Workspace Structure & Hygiene (2025-10-11)

This guide defines the canonical layout for CATAMS so that automation agents (Codex CLI, Codex Web, etc.) always place new assets in predictable locations. Follow these rules whenever creating, deleting, or relocating files.

## 1. Permanent Directories

| Path | Purpose | Example Contents |
| --- | --- | --- |
| `src/main/java/com/usyd/catams/` | Spring Boot production code | `controller/`, `application/`, `domain/`, `entity/`, `repository/`, `config/` |
| `src/main/java/com/usyd/catams/service/` | Domain services | `Schedule1PolicyProvider`, `Schedule1Calculator`, `TimesheetService` |
| `src/main/java/com/usyd/catams/repository/` | Spring Data repositories | `TimesheetRepository`, `RateCodeRepository`, `RateAmountRepository`, `PolicyVersionRepository` |
| `src/test/java/com/usyd/catams/` | Backend tests | `unit/`, `integration/`, `repository/`, `support/fixtures` |
| `schema/` | Shared schemas exported from OpenAPI or SSOT | `*.json`, `*.yaml` |
| `frontend/src/` | React application code | Components, hooks, store, utilities |
| `frontend/src/components/shared/` | Reusable UI pieces | `TimesheetTable/`, `StatusBadge/`, etc. |
| `frontend/src/test/utils/` | Vitest helpers and fixtures | `test-utils.ts`, builders |
| `frontend/e2e/` | Playwright assets | `mock/`, `real/`, `shared/`, `config/`, `fixtures/` |
| `frontend/screenshots/` | Approved golden images for visual regression | `mock/*.png`, `visual/*.png` |
| `frontend/e2e/visual/` | Visual comparison specs (Chromium/WebKit regression) | `*.spec.ts` |
| `frontend/src/contracts/generated/` | Generated TypeScript contract types (do not edit manually) | `common.ts`, `timesheet.ts`, `index.ts` |
| `tools/scripts/` | Authoritative Node orchestration scripts | `test-backend*.js`, `test-frontend*.js`, `run-e2e*.js` |
| `scripts/` | Thin shims to simplify CLI usage | `cleanup-ports.js` delegates to `tools/scripts` |
| `docs/` | Human & AI documentation | Architecture, deployment, guidelines, reports |
| `infra/` | Deployment + IaC artefacts (migrated from `.bmad-infrastructure-devops/`) | Terraform, Docker, platform runbooks |
| `.devtools/ai/` | Assistant configuration (Claude, Gemini, Cursor, BMAD) | `*.json`, prompts, local settings |

## 2. Generated / Ephemeral Directories

These paths should stay out of version control and can be deleted between runs. Automation may recreate them on demand.

- Root: `build/`, `target/`, `test-results/`, `logs/`, `learning/`, `recovery/`
- Frontend: `frontend/node_modules/`, `frontend/dist/`, `frontend/coverage/`, `frontend/playwright-report/`, `frontend/.playwright/`, `frontend/.vite/`
- Tooling caches: `.gradle/`, `.cache/`, `.turbo/`, `.parcel-cache/`

> ✅ **Automation rule:** remove ephemeral trees before handing work back to a human unless the user explicitly says to keep them for debugging.

## 3. Placement Rules for New Assets

- **Backend Java:** Match existing package boundaries (`controller`, `application`, `domain`, etc.). Do not create new top-level packages without ADR approval.
- **Domain fixtures / SQL:** Place under `src/test/resources/` mirroring the Java package.
- **Frontend React components:** Prefer co-locating styles/tests within the component folder (`Component.tsx`, `Component.test.tsx`, `Component.css`).
- **Vitest helpers:** Extend `frontend/src/test/utils/`.
- **Playwright specs:**
  - Mocked flows → `frontend/e2e/mock/tests/`
  - Real backend flows → `frontend/e2e/real/modules/`
  - Shared fixtures / page objects → `frontend/e2e/shared/`
  - Visual regression → `frontend/e2e/visual/`
  - Screenshots → `frontend/screenshots/`
- **Backend integration tests:** Use suffix `IT` or `IntegrationTest` and run via `./gradlew integrationTest`.
- **Images & design tokens:** Use `frontend/src/assets/` (icons) or `frontend/src/styles/` (CSS/tokens).
- **Documentation:** Place new guides in `docs/` and update `docs/index.md` if a new topic is introduced.

## 4. Test Execution Quick Reference

- Backend: `./gradlew test`
- Frontend unit/coverage: `npm run test:coverage`
- Component harness: `npm run test:component`
- Playwright:
  - Mock project: `npm run test:e2e:mock`
  - Real backend: `npm run test:e2e:real`
  - Visual regression: `npm run test:e2e:visual`
  - Smoke filter: `npm run test:e2e:smoke`
  - Reporter UI: `npm run test:e2e:report`
- Port cleanup (pre/post E2E): `node scripts/cleanup-ports.js --ports=8084,5174`

## 5. Expectations for AI Agents

1. **Respect existing directories.** No new top-level folders without explicit user approval.
2. **Keep workspace tidy.** Delete obsolete generated folders (see §2) before completion.
3. **Document structural changes.** If you add/move files, update this document or `PROJECT_DOCS.md` accordingly.
4. **Prefer reusable helpers.** Extend shared utilities before adding one-off scripts.
5. **Log test commands executed** in the final report so humans and downstream agents know the current state.
6. **AI tooling lives in `.devtools/`.** Anything formerly under `.claude`, `.gemini`, or `.cursor` has moved to `.devtools/ai/`.

Following these rules keeps the repository deterministic for automation and humans alike.


# Repository Guidelines

## Project Structure & Module Organization
- **frontend/** React/Vite application with `src/` for components/hooks, `e2e/` Playwright suites, and `public/` assets.
- **src/** (root) contains JVM backend sources and `services/` layer; integration tests live under `src/test/java`.
- **tools/** utility scripts (automation, scaffolding); **test-results/** stores generated reports. Keep generated artefacts out of version control unless explicitly required.

## Build, Test, and Development Commands
- `npm run dev` (from `frontend/`): launches the Vite dev server with hot reload.
- `npm run build` (frontend): bundles the React app and runs production build validation.
- `npm run test` / `npm run test -- <pattern>` (frontend): executes the Vitest suite; append a path to scope to specific specs.
- `npm run test:e2e` (frontend): runs Playwright end-to-end workflows; ensure the backend is reachable or use the mock fixture.
- `./gradlew build` (repository root): compiles the backend, executes unit/integration tests, and assembles artefacts.

## Coding Style & Naming Conventions
- TypeScript/React: 2-space indentation, PascalCase for components, camelCase for functions/variables, kebab-case for file names (e.g., `TutorDashboard.test.tsx`).
- Java backend: follow Google Java Style; package names lower-case dot notation.
- Run `npm run lint` for ESLint/TypeScript checks and `./gradlew spotlessApply` to auto-format Java when available.

## Testing Guidelines
- Unit/component tests rely on Vitest + Testing Library; name files `*.test.tsx` or `*.test.ts`.
- Playwright E2E specs live in `frontend/e2e/`; prefer descriptive names like `critical-user-journeys.spec.ts`.
- Backend uses JUnit 5; integration tests belong in `src/test/java` mirroring the main package structure. Aim for ≥80% coverage on new modules and include regression tests for bug fixes.

## Commit & Pull Request Guidelines
- Follow imperative, present-tense commit messages (`feat: add tutor approval flow`). Group related changes; avoid mixing backend/frontend unless necessary.
- PRs should include: concise summary, linked issue (if tracked), test evidence (`npm run test`, `./gradlew test` output), and screenshots for UI-affecting work. Request review from domain owners (frontend vs backend) and ensure CI passes before merge.

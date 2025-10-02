# CATAMS Frontend

Modern React + TypeScript single-page application for the Casual Academic Time Allocation Management System (CATAMS).

## Highlights
- ⚡ Vite 7 dev server and build pipeline with TypeScript path aliases (`@/...`).
- 🎨 Tailwind-powered design system with shadcn-inspired UI primitives.
- 🔐 Authenticated dashboards for tutors, lecturers, and admins backed by Axios services.
- 🧪 Vitest + Testing Library unit/component coverage and Playwright E2E suites orchestrated through `npm run test:ai`.

## Prerequisites
- Node.js 18+
- Running CATAMS backend (default `http://localhost:8080`, E2E profile on `http://localhost:8084`).
- Modern browser with ES2020 support.

## Quick Start
```bash
npm install
npm run dev            # http://localhost:5174 with hot reload
```

Login with seed credentials (e.g. `lecturer@example.com` / `Lecturer123!`) or use your own backend data.

## Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Standard development server at port 5174. |
| `npm run dev:e2e` | Development server in E2E mode (enables MSW/auth bypass flags). |
| `npm run build` | Type-check + Vite production build + artifact validation. |
| `npm run preview` | Preview the production bundle locally. |
| `npm run lint` / `npm run lint:fix` | ESLint checks (TypeScript aware). |
| `npm run test` | Vitest run of all unit/component suites. |
| `npm run test:component` / `npm run test:unit` | Targeted component or utility runs. |
| `npm run test:e2e` | Full Playwright workflow using the AI orchestrator pipeline. |
| `npm run test:ai` | Smart test pyramid (fast → integration → playwright). |

## Testing Stack
- **Vitest** for units/components, configured in `vitest.config.ts` (`jsdom`, shared setup/teardown).
- **Playwright** for E2E (`playwright.config.ts`) with role-specific journeys under `e2e/`.
- `scripts/run-e2e-ai.js` keeps backend/frontend orchestration host/port aware for reliable CI use.

## Project Layout
```
frontend/
├─ src/
│  ├─ components/
│  │  ├─ dashboards/           # Role dashboards (Tutor/Lecturer/Admin)
│  │  ├─ shared/               # Tables, status badges, etc.
│  │  └─ ui/                   # Button, card, input primitives
│  ├─ contexts/                # Auth context
│  ├─ hooks/                   # Data hooks (timesheets, dashboards)
│  ├─ services/                # Axios service layer
│  ├─ utils/                   # Formatting, validation, secure logging
│  ├─ test-utils/              # Vitest helpers & global teardown
│  └─ index.modern.css         # Tailwind entrypoint + design tokens
├─ scripts/                    # Orchestration helpers (e2e, test pyramid)
├─ e2e/                        # Playwright specs, fixtures, page objects
├─ docs/                       # Historical execution reports (see below)
└─ vite.config.ts              # Vite + alias configuration
```

## Working with Tailwind & PostCSS
Tailwind is configured through `tailwind.config.ts` and consumed from `postcss.config.js`. No extra Vite `css.postcss` block is required—the builder auto-loads the shared PostCSS config.

## Documentation
- `../PROJECT_DOCS.md` — Repository-wide architecture overview and maintenance log (updated Sept 2025).
- `docs/reports/` — Legacy investigations and AI-generated reports kept for reference; feel free to prune further as the team aligns on what to archive.

## Test Pyramid Workflow
Run the orchestrated pyramid before landing substantial changes:
```bash
npm run test:ai
```
This installs deps if needed, ensures backend availability (uses `E2E_*` env overrides), launches the Vite E2E server, executes API contracts, and finally the full Playwright matrix. Logs are emitted with host awareness so localhost/127.0.0.1 differences no longer block readiness checks.

## Housekeeping Notes
- Technical-debt cleanup (Sept 2025) removed obsolete AI scripts, temporary test files, and unused dependencies (`@vitest/ui`, `tsx`).
- `scripts/run-e2e-ai.js` and `scripts/test-ai-smart.js` are the supported entry points for automation; deprecated scripts were deleted to keep the surface area lean.
- Coverage artifacts, Playwright reports, and other generated outputs stay ignored—see `.gitignore` for the authoritative list.
- Latest cleanup (Oct 2025) purged generated Playwright artefacts (`playwright-report/`, `test-results/`, `temp/`) so the repo stays lean; rerun `npm run test:ai` to regenerate them locally as needed.

Happy hacking! 🎉


# Cleaning Generated Artifacts

This project deliberately excludes all build outputs, reports and caches from version control. Use the commands below to wipe generated content safely.

What gets deleted
- Backend: `build/`, `.gradle/`, `test-results/`
- Frontend: `frontend/dist/`, `frontend/coverage/`, `frontend/playwright-report/`, `frontend/playwright-screenshots/`, `frontend/test-results/`, `frontend/trace-inspect/`, `frontend/.vite/`, `frontend/src/contracts/generated/`
- Repo-level: `artifacts/`, `logs/`, `*.tsbuildinfo`, `act-*.log`, `gh-job-*.log`, `*.tmp`, `tmp_*`

Commands
- Cross-platform:
  - `npm run clean` (prefers Bash, falls back to PowerShell on Windows)
- Targeted:
  - Backend: `npm run clean:backend` (runs Gradle clean; best-effort)
  - Frontend: `npm run clean:frontend` (runs `frontend` clean script)

Notes
- Cleaning does not touch databases or Docker volumes. For E2E data, restart `docker compose` services or use the test reset API invoked by the E2E runner.
- If files remain due to permission issues, run the scripts from an elevated shell.


# Quickstart: Create Timesheet Feature

## Run stack (Docker)
- `docker compose up -d db api web`
- Frontend: http://localhost:5174
- API: http://localhost:8080 (proxied for web container)

## E2E (Docker runner)
- Set env: `E2E_BACKEND_MODE=docker`
- Smoke: `npm --prefix frontend run test:e2e:smoke`
- Full: `npm --prefix frontend run test:e2e:full`
- Report: `npm --prefix frontend run test:e2e:report`

## Expectations
- Create opens from loading and loaded dashboard states
- Quote updates on critical field changes; submit blocked until success
- 403 shows assignment guidance; 400 shows field error and focuses it
- Modal: focus trap, ESC close, focus restore


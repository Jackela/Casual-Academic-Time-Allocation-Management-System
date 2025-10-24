# Quickstart — CATAMS E2E (Real Backend)

## Environment
Create `.env.e2e` (root or `frontend/`) with:

```
E2E_BACKEND_URL=http://127.0.0.1:8084
E2E_FRONTEND_URL=http://127.0.0.1:5174

E2E_ADMIN_EMAIL=admin@example.com
E2E_ADMIN_PASSWORD=Admin123!
E2E_LECTURER_EMAIL=lecturer@example.com
E2E_LECTURER_PASSWORD=Lecturer123!
E2E_TUTOR_EMAIL=tutor@example.com
E2E_TUTOR_PASSWORD=Tutor123!
```

Load order is managed by `frontend/e2e/config/e2e.config.ts` (root and frontend `.env*`).

## Run
- Backend: `./gradlew bootRun --args="--spring.profiles.active=e2e"`
- Frontend (E2E Vite server): `npm run -w frontend dev:e2e`
- Playwright Real Suite (all): `npm run -w frontend test:e2e:real`
- Tags: `npm run -w frontend test:e2e:p0` (or `:p1`,`:p2`,`:approvals`)

## Notes
- Programmatic login uses `frontend/e2e/api/auth-helper.ts` and `real/global.setup.ts`.
- Use only `data-testid` selectors. See `specs/e2e-refactor/plan.md` §3 for canonical ids.

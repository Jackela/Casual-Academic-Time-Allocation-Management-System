# CATAMS Documentation Hub

> Archive / Reference Project: this repository is being preserved as a verified snapshot for portfolio, learning, reproduction, and architecture study. Start with the Chinese archive entrance if you are new to the codebase.

## Quick Entry

- Chinese main entry: [`../README.zh-CN.md`](../README.zh-CN.md)
- Archive notice: [`archive/ARCHIVE-NOTICE.zh-CN.md`](archive/ARCHIVE-NOTICE.zh-CN.md)
- Start here: [`archive/START-HERE.zh-CN.md`](archive/START-HERE.zh-CN.md)
- Run locally: [`archive/RUN-LOCALLY.zh-CN.md`](archive/RUN-LOCALLY.zh-CN.md)
- Honest adaptation guide: [`archive/ADAPTATION-GUIDE.zh-CN.md`](archive/ADAPTATION-GUIDE.zh-CN.md)
- Chinese PDF handbook: [`archive/archive-handbook.zh-CN.pdf`](archive/archive-handbook.zh-CN.pdf)
- English showcase: [`../README.md`](../README.md)

## Current Effective Documents

- Product requirements (SSOT): `docs/product/requirements/University-of-Sydney-Enterprise-Agreement-2023-2026.pdf` and searchable `.txt`
- API contract (SSOT): `docs/openapi.yaml`
- Architecture (SSOT): `docs/architecture/overview.md`
- Backend development: `docs/backend/development-guide.md`
- Frontend architecture: `docs/frontend/architecture.md`
- Testing and reports: `docs/testing/README.md`
- User guide: `docs/product/user-guide.md`
- Archive and reproduction entrance: `docs/archive/*.zh-CN.md`

## Minimal Reproduction Path

1. Read [`archive/RUN-LOCALLY.zh-CN.md`](archive/RUN-LOCALLY.zh-CN.md)
2. Start the fast path with `docker compose up -d db api`, then run the frontend on `5174`
3. Reset and seed with `node scripts/e2e-reset-seed.js --url http://127.0.0.1:8084 --token local-e2e-reset`
4. Log in with `admin@example.com`, `lecturer@example.com`, or `tutor@example.com`
5. Run `node scripts/e2e-runner.js --project=real`

## Historical Process Records

The following folders are kept as evidence of past implementation and verification work, but they are not the current starting point for readers:

- `docs/archive/2025-11/`
- `docs/archive/2026-03/process-reports/`

Treat those files as historical process records, not as the current operating handbook.

## Directory Map

| Directory | Purpose |
|-----------|---------|
| `archive/` | Archive entrance docs, handbook source, PDF, and historical reports |
| `architecture/` | High-level system design and code structure |
| `backend/` | API, data, and backend development guides |
| `frontend/` | UX specs, architecture, and frontend testing notes |
| `ops/` | Deployment, automation, and runbooks |
| `policy/` | EA compliance policies and governance |
| `product/` | User guide, requirements, release notes |
| `testing/` | Test strategies, reports, and quick-start material |

## Archive and License Notes

- `main` is the canonical branch retained for this snapshot.
- Open PRs and legacy branches have already been cleaned up.
- The repository is publicly readable but the current `LICENSE` remains proprietary to the University of Sydney.
- If you want to study or reimplement the project, start with the Chinese archive docs and review the adaptation guide before reusing any materials.

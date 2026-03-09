# Rewrite Cutover Notes (2026-03-09)

## Freeze Window

- Freeze start: 2026-03-09 (Asia/Shanghai)
- Decision: rewrite `main` with a single cutover window.
- Enforcement during window:
  - No direct push/merge to `main`.
  - Rewrite branch validated first, then `--force-with-lease` cutover.

## Backup Anchors

- Backup branch: `codex/archive-main-pre-rewrite-20260309`
- Backup tag: `pre-rewrite-20260309`
- Base commit: `30fb98d5a04da07c3d382132f8285ae632fca515`

Rollback command set:

```bash
git fetch origin
git checkout main
git reset --hard pre-rewrite-20260309
git push --force-with-lease origin main
```

## Repository Snapshot

- Repository: `Jackela/Casual-Academic-Time-Allocation-Management-System`
- URL: https://github.com/Jackela/Casual-Academic-Time-Allocation-Management-System
- Default branch at snapshot: `main`
- Open PR count: `0`
- Main branch protection at snapshot: **Not enabled** (`GET /branches/main/protection` returned 404)

## Recent PR Snapshot

- #21 `refactor: Strategy, Factory, Observer patterns with TDD` (merged 2026-02-27)
- #20 `docs: Rewrite README with 12 Mermaid diagrams and add code quality utilities` (merged 2026-02-26)
- #19 `feat: Add branch protection and manual validation infrastructure` (merged 2026-02-26)

## Recent CI Snapshot (Basic CI)

- Run 22468892867 (push main): success
- Run 22443269627 (PR #21): success
- Run 22443094075 (PR #21): failure (historical)
- Run 22442879305 (PR #21): failure (historical)
- Run 22438643869 (push main): success

Reference:
- Actions: https://github.com/Jackela/Casual-Academic-Time-Allocation-Management-System/actions

## Cutover Acceptance Checklist

- [ ] `./gradlew test --rerun-tasks`
- [ ] `npm --prefix frontend run lint`
- [ ] `npm --prefix frontend run test`
- [ ] `npm --prefix frontend run test:e2e:full`
- [ ] `openspec validate refactor-architecture-purity-final --strict`
- [ ] grep-gate passed
- [ ] branch protection configured and verifiable via GitHub API
- [ ] tag + release published (`v1.0.0`)

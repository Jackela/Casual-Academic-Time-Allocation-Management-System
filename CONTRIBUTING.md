# Contributing to CATAMS

Thanks for helping improve the Casual Academic Time Allocation Management System. Follow these guidelines to keep the repository predictable for everyone.

## 1. Ground Rules

- Use English for all code comments, documentation, commit messages, and test descriptions (see [`docs/governance/translation-charter.md`](docs/governance/translation-charter.md)).
- Follow the domain-driven design boundaries already in place (`controller → application → domain → repository`).
- Prefer incremental PRs that include tests and documentation updates in the same change set.
- Keep the root clean. New automation scripts belong in `tools/scripts/`; keep `scripts/` limited to thin shims.

## 2. Development Workflow

1. Fork or branch from `main`.
2. Run the task matrix commands relevant to your work (`docs/tasks.md`).
3. Update documentation when adding features, changing workflows, or introducing new directories.
4. Run the full regression suite (see below) before asking for review.
5. Submit a PR with:
   - Description of changes and rationale.
   - Linked issue/ADR (if applicable).
   - Checklist confirming tests and linting.

## 3. Commit & Branch Naming

- Use Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`…).
- Short-lived feature branches: `feature/<scope>`.
- Bug fixes: `fix/<issue-id>-<slug>`.
- Documentation-only: `docs/<topic>`.

## 4. Testing Expectations

Run these before opening a PR:

```bash
./gradlew clean test                     # Backend unit + integration
./gradlew integrationTest                # Additional integration (once added)
cd frontend && npm ci
npm run test:ci                          # Frontend unit/component/api
npm run test:e2e:mock                    # Playwright with MSW backend
npm run backend:start && npm run test:e2e:real && npm run backend:stop
npm run test:e2e:visual                  # Visual regression (update baselines when intentional)
```

If you cannot execute a command (e.g., missing Docker), note it clearly in the PR and coordinate with the team to run it.

## 5. Documentation

- Keep `docs/index.md` up to date whenever adding or renaming files.
- Log architecture or tooling decisions as ADRs in `docs/adr/` using the naming pattern `NNNN-title.md`.
- Update [`docs/tasks.md`](docs/tasks.md) if you introduce new automation commands.

## 6. Code Review Checklist

- [ ] Code matches the acceptance criteria and existing architecture.
- [ ] All new/changed tests pass locally.
- [ ] No new warnings in build logs.
- [ ] Documentation and comments updated.
- [ ] No generated artifacts or large binaries committed.
- [ ] `.gitignore` covers any new output directories.

## 7. Security & Secrets

- Never commit credentials, access tokens, or `.env` overrides.
- Use environment variables and reference examples in `.env.example`.
- Report suspected security issues privately to the maintainers instead of opening a public issue.

## 8. Contact

Questions? Reach out on Slack `#catams-dev` or tag the maintainers listed in `CODEOWNERS`.

Happy shipping!

# Release Checklist

## 1. Versioning and Tagging

- [ ] Version follows SemVer (`vMAJOR.MINOR.PATCH`).
- [ ] Release tag is annotated (`git tag -a vX.Y.Z -m "..."`).
- [ ] Tag pushed to origin (`git push origin vX.Y.Z`).

## 2. Quality Gate

- [ ] `./gradlew test --rerun-tasks`
- [ ] `npm --prefix frontend run lint`
- [ ] `npm --prefix frontend run test`
- [ ] `npm --prefix frontend run test:e2e:full`
- [ ] `openspec validate --strict`

## 3. Data and Contracts

- [ ] Flyway migrations reviewed for backward compatibility.
- [ ] Required rate/policy data exists in target environment.
- [ ] OpenAPI contract updated when API behavior changes.

## 4. Governance

- [ ] `main` branch protection is active and includes required checks.
- [ ] PR linked to release notes and migration notes.
- [ ] Security-impacting changes documented.

## 5. Publish

- [ ] Push tag to trigger `.github/workflows/release.yml`.
- [ ] GitHub Release auto-created with generated notes.
- [ ] `CHANGELOG.md` updated with released version summary.

## 6. Post-Release Verification

- [ ] Smoke test tutor submit/approve path.
- [ ] Smoke test payroll quote/create/update path.
- [ ] Monitor application logs and alert channel for 30 minutes.

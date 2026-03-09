# Branch Protection Baseline

This repository uses a protected `main` branch with mandatory PR workflow.

## Required policy for `main`

- Require pull requests before merge.
- Require at least 1 approving review.
- Require CODEOWNERS review.
- Require status checks:
  - `backend`
  - `frontend-unit`
  - `e2e`
- Require linear history.
- Restrict direct pushes.
- Block branch deletion.
- Enforce rules for administrators.

## Temporary maintenance window policy

For controlled history rewrites only:

1. Temporarily allow force-push for repository admins.
2. Execute a single `--force-with-lease` cutover.
3. Immediately disable force-push again.

## Verification command

```bash
gh api repos/Jackela/Casual-Academic-Time-Allocation-Management-System/branches/main/protection
```

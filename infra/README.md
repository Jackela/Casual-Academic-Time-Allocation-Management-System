# Infrastructure Hub

The `infra/` directory is the future home for deployment automation, infrastructure-as-code, and operational runbooks. Content is migrating from the legacy `.bmad-infrastructure-devops/` folder in stages to avoid breaking existing tooling.

## Current Status (2025-10-11)

- ✅ Directory created and tracked.
- 🔄 Migration plan documented in [ADR 0001](../docs/adr/0001-root-hygiene-and-contract-pipeline.md).
- 🔜 Terraform, pipeline definitions, and deployment scripts will move here in upcoming iterations.

## Migration Notes

1. Treat `.bmad-infrastructure-devops/` as read-only. When you need to update infra assets, copy them here and update references.
2. Update documentation (`docs/DEPLOYMENT.md`, runbooks) once assets move.
3. After all consumers switch to `infra/`, the legacy directory will be removed.

## Structure (Proposed)

```
infra/
  platform/          # Terraform, CloudFormation, IaC modules
  pipelines/         # CI/CD workflows, GitHub Actions, Jenkinsfiles
  scripts/           # Deployment helpers (shell/PowerShell)
  docs/              # Operational runbooks
```

> Keep this README updated as migration progresses.

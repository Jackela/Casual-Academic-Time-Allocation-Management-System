# Documentation Refactor Master Plan (Phase 0)

This plan is the canonical blueprint for rebuilding the CATAMS documentation to match the intended EA-compliant structure. Follow these steps exactly; all future doc work must reference this plan as the single source of truth.

---

## 1. Target Information Architecture

Create the following directory tree with `docs/index.md` as the sole entry point:

```
docs/
├── index.md                # Documentation hub (replaces DOCUMENTATION_INDEX.md)
├── adr/                    # Architecture decision records
├── policy/                 # EA compliance policies, governance, SSOT rules
├── rfc/                    # Requests for comment / change proposals
├── architecture/           # High-level & component architecture references
├── backend/                # Backend-specific guides, API contracts, data models
├── frontend/               # Frontend guides, UX specs, Playwright references
├── ops/                    # Deployment, scripts, troubleshooting, infra notes
├── testing/                # Test strategy, matrices, fixtures
├── product/                # PRDs, requirements, stakeholder reports, stories
└── references/             # Glossaries, style guides, historical reports
```

> **Note:** Subdirectories listed below inherit this layout. Any document not assigned explicitly will be either deleted or rewritten per sections 4–6.

---

## 2. Audit Summary & Issues (vs EA_COMPLIANCE_PLAN.md)

- **Fragmented entry points**: `DOCUMENTATION_INDEX.md`, `PROJECT_DOCS.md`, `README.md`, and `DOCS_UPDATE_PLAN.md` compete as navigational hubs. None reflect the EA policy-driven backend.
- **Legacy financial guidance**: `USER_GUIDES.md`, `ui-ux-design-spec.md`, `timesheet-approval-workflow-ssot.md`, and `developer-guide-policy-pattern.md` still mention client-managed hourly rates, contradicting the backend SSOT mandate.
- **Architecture sprawl**: Multiple overlapping design docs (`ARCHITECTURE.md`, `architecture-v2.0-microservices-ready.md`, `CATAMS-Architecture-Whitepaper.md`, `architecture/project-structure*.md`, `database-schema-microservices-organization.md`) repeat or conflict, especially around timesheet schema and rate tables.
- **API drift**: `API_DOCUMENTATION.md`, `approval-workflow-api-update.md`, and `contracts/README.md` do not consistently describe `/timesheets/quote` or server-side recalculation requirements.
- **Operational docs**: `DEPLOYMENT.md`, `scripts/SCRIPT_GUIDE.md`, `TROUBLESHOOTING.md` need explicit references to policy migrations and calculator fallbacks.
- **Story & PRD artifacts**: `stories/*.md`, `prd-v0.2.md`, `frontend-modernization-prd.md` still reference client-side calculators and outdated acceptance criteria.
- **Miscellaneous roots**: `CONTRIBUTING.md`, `PROJECT_DOCS.md`, `CLEANUP_SUMMARY.md`, `UI_REFACTOR_PLAN.md`, `DOCS_UPDATE_PLAN.md`, and other ad-hoc plans must be consolidated or archived.
- **README misalignment**: Root `README.md` focuses on baseline v1 and lacks the EA compliance context, backend quote flow, or documentation entry instructions.

---

## 3. Documents To Delete (Remove or Archive)

| Path | Reason |
|------|--------|
| `DOCS_UPDATE_PLAN.md` | Superseded by this Phase 0 refactor plan. |
| `PROJECT_DOCS.md` | Outdated navigation list; to be replaced by `docs/index.md`. |
| `CLEANUP_SUMMARY.md` | Historical effort log, no longer relevant. |
| `UI_REFACTOR_PLAN.md` | Frontend refactor completed; insights will be captured in frontend documentation rewrite. |
| `PLAYWRIGHT_REMEDIATION_PLAN.md` | Obsolete once testing section is rewritten. |
| `IMPLEMENTATION_SPRINT_1.md` | Sprint notes; archive externally if needed. |
| `UI layout-ssot-refactor.md` (if still present) | Redundant after UX redesign doc refresh. |
| `docs/ai-friendly-javadoc-quality-report.md` & `docs/javadoc-ai-friendly-standards.md` | Non-actionable boilerplate; content will be merged into backend reference if still required. |
| `docs/frontend-modernization-prd.md` | Replaced by EA compliance implementation summary. |
| `docs/stakeholder-validation-report.md` | Superseded by EA compliance roll-out reporting; retain only if product team requests archival. |
| `docs/scripts/SCRIPT_GUIDE.md` | Outdated script inventory; to be merged into `ops/automation.md`. |
| `docs/approval-workflow-api-update.md` | Content duplicated in modern API docs. |
| `docs/project-summary-policy-implementation.md` | Replace with EA compliance retrospective inside policy section. |
| `docs/architecture-v2.0-microservices-ready.md` | Outdated architecture milestone; merge necessary parts into new architecture overview. |

> Archive deleted files under `/archive/` if historical reference is required; otherwise remove from repo.

---

## 4. Documents To Move & Refactor

| Current Path | Destination | Refactor Notes |
|--------------|-------------|----------------|
| `ARCHITECTURE.md` | `docs/architecture/overview.md` | Compress to EA-aligned domain model, reference Schedule 1 services. |
| `CATAMS-Architecture-Whitepaper.md` | — (removed) | Obsolete microservices roadmap; canonical view captured in `docs/architecture/overview.md`. |
| `architecture/project-structure.md` & `project-structure-v2.0.md` | `docs/architecture/` as `code-structure.md` | Merge into single document with current package layout. |
| `database-schema-microservices-organization.md` | `docs/backend/data-model.md` | Focus on `policy_version`, `rate_code`, `rate_amount`, `timesheets` updates. |
| `API_DOCUMENTATION.md` | `docs/backend/api-timesheets.md` | Split general API doc into modular sections; quote endpoint emphasized. |
| `DEVELOPER_GUIDE.md` | `docs/backend/development-guide.md` | Backend-focused guide referencing SSOT and calculator usage. |
| `developer-guide-policy-pattern.md` | `docs/policy/authorization-guide.md` | Keep only policy-system sections; remove stale timesheet sections replaced by calculator. |
| `DEPLOYMENT.md` | `docs/ops/deployment-guide.md` | Update with EA migrations, calculator verification steps. |
| `TROUBLESHOOTING.md` | `docs/ops/troubleshooting.md` | Ensure quote/calculator runbooks included. |
| `timesheet-approval-workflow-ssot.md` | `docs/policy/timesheet-ssot.md` | Rewrite to emphasize backend calculations, remove lecturer-side rate editing. |
| `ui-ux-design-spec.md` | `docs/frontend/ux-spec.md` | Update for quote-driven UI and read-only financial fields. |
| `USER_GUIDES.md` | `docs/product/user-guide.md` | Split by role; highlight quote & SSOT behaviour. |
| `WORKSPACE_STRUCTURE.md` | `docs/architecture/workspace-structure.md` | Reference new directory layout and generated files. |
| `stories/*.story.md` | `docs/product/stories/` | Update acceptance criteria for backend-calculated totals. |
| `requirements-matrix.csv` | `docs/product/requirements-matrix.csv` | Add EA acceptance cases. |
| `scripts/SCRIPT_GUIDE.md` | `docs/ops/automation.md` | Integrate with new ops section (post-deletion). |
| `docs/testing/*.md` | `docs/testing/` keep same but update references to calculator tests & quote Playwright suite. |
| `docs/tasks.md` | `docs/backend/task-matrix.md` | Align commands with EA-compliant workflows. |

---

## 5. New Documents To Create

| New Path | Purpose & Outline |
|----------|------------------|
| `README.md` (root rewrite) | Concise repo overview. Sections: 1) EA Compliance Summary 2) Quick Start (backend+frontend) 3) Documentation entry (`docs/index.md`) 4) Key Commands 5) Support & Contribution pointers. |
| `docs/index.md` | Canonical documentation hub. Sections: Introduction, How to Use Docs, Role-based navigation (Developer, Product, Operations), Quick Links to policy/architecture/testing, Release Notes link. |
| `docs/policy/ea-schedule1-overview.md` | High-level explanation of EA Schedule 1, mapping to policy tables and calculator responsibilities. |
| `docs/policy/backend-ssot.md` | Clarify backend single source of truth policies, quote workflow, acceptable overrides. |
| `docs/backend/api-overview.md` | REST API entry page summarizing modules, linking to specific endpoint docs (timesheets, approvals, auth). |
| `docs/backend/timesheet-domain.md` | Domain model explanation including `Schedule1Calculator`, `Schedule1PolicyProvider`, entity relationships. |
| `docs/frontend/architecture.md` | React app structure, quote polling, read-only financial fields. |
| `docs/frontend/testing.md` | Playwright suites, mocked vs real flows, quote-specific tests. |
| `docs/frontend/ui-copy.md` | Calculator transparency messages and error copy guidelines. |
| `docs/ops/automation.md` | Consolidated script references and pipeline steps. |
| `docs/ops/runbooks.md` | Include quote failure response, migration verification, rollback strategy. |
| `docs/ops/release-checklist.md` | Release steps including Flyway migrations and calculator regression checks. |
| `docs/testing/strategy.md` | Replace/augment README with layered testing strategy referencing calculator tests. |
| `docs/product/release-notes.md` | Track EA compliance release and future policy updates. |
| `docs/rfc/` (initial file `README.md`) | Explain RFC process; migrate any pending plans here. |
| `docs/policy/` (create index) | Link to SSOT policies, authorization patterns, EA references. |
| `docs/adr/index.md` | Table summarizing ADRs (starting from existing `0001`). |

---

## 6. Documents To Reconcile or Archive (Decision Required)

| Path | Action |
|------|--------|
| `CONTRIBUTING.md` | Update references to new docs; keep at repo root. |
| `AGENTS.md` & `.bmad-core/*.md` | Leave untouched (tooling references). |
| `docs/policy/ea-compliance-plan.md` | Keep as locked legislative reference for Schedule 1. |
| `DOCS_REFACTOR_PLAN.md` (this plan) | Keep at repo root until Phase 0 completion, then move to `docs/rfc/phase0-docs-refactor.md` for archival. |
| `CATAMS-UAT-REPORT.md`, `COMPREHENSIVE-UAT-REPORT.md` | Relocate to `docs/product/reports/` if still needed; otherwise archive. |
| `frontend/README.md`, `frontend/INTEGRATION_GUIDE.md`, etc. | Harmonize with new `docs/frontend/` structure; cross-link after rewrite. |
| `infra/README.md` | Reference from `docs/ops/` (ensure Platform docs align). |
| `requirements/` PDFs and text | Keep as legal refs; link from policy overview. |

---

## 7. Root `README.md` – Final Content Outline

1. **Title & EA Compliance Summary** – Brief system description emphasising backend SSOT and Schedule 1 alignment.  
2. **Quick Start** – Backend, frontend, and quote API verification steps.  
3. **Key Commands** – Short table of the most used Gradle/npm commands.  
4. **Documentation** – Point explicitly to `docs/index.md` as the single entry point.  
5. **Testing Matrix** – Bullet summary pointing to `docs/testing/strategy.md`.  
6. **Support & Contribution** – Links to issue tracker, `CONTRIBUTING.md`, and policy contacts.  
7. **Licensing / Attribution** (if applicable).  

All diagrams removed from README (move to docs). Keep < 120 lines.

---

## 8. `docs/index.md` – Final Content Outline

1. **Welcome & Scope** – One paragraph describing CATAMS docs.  
2. **How to Navigate** – Bullet list linking to major personas (Developer, Product, Operations, QA, UX).  
3. **EA Compliance Quick Links** – Links to `ea-schedule1-overview`, `backend-ssot`, API docs.  
4. **Newest Updates / Release Notes** – Latest release summary.  
5. **Directory Map** – Table mapping new subdirectories to contents.  
6. **Getting Help** – How to request doc updates or raise issues.  
7. **Glossary Reference** – Link to policy terminology.  

Ensure this file replaces all references to `DOCUMENTATION_INDEX.md`.

---

## 9. Execution Steps (High Level)

1. **Create target directory structure** (Section 1).  
2. **Delete or archive identified docs** (Section 3).  
3. **Move and refactor existing documents** per Section 4, rewriting content to align with EA_COMPLIANCE_PLAN.md.  
4. **Author new documents** listed in Section 5, pulling accurate data from current implementation and tests.  
5. **Update root README** and populate `docs/index.md` using outlined content.  
6. **Fix all internal links** to refer to new paths (search for references to deleted files).  
7. **Run link checker / markdown lint** (if available) and ensure tests referencing docs are updated.  
8. **Archive this plan under `docs/rfc/`** once work is complete and announce documentation freeze lift.  

---

Adhering to this plan guarantees a cohesive, EA-compliant documentation set with a unified entry point and consistent structure for future maintenance. Any deviations must be recorded via a new RFC. ***

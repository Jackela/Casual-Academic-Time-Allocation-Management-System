# Contract-First Workflow

This document explains how JSON Schemas under `schema/` power both backend and frontend models through automated generation.

## Source of Truth

- JSON Schemas live in `schema/*.schema.json`.
- `schema/contracts.lock` records the SHA-256 fingerprint of each schema to detect drift.
- The pipeline is orchestrated by `tools/scripts/contracts-pipeline.js`.

## Generated Artifacts

| Target | Location | Notes |
| --- | --- | --- |
| Java POJOs | `build/generated-contracts/java/com/usyd/catams/contracts/*.java` | Added to `sourceSets.main` automatically |
| TypeScript types | `frontend/src/contracts/generated/*.ts` | Committed to VCS; import via `@/contracts` |
| TypeScript barrel | `frontend/src/contracts/index.ts` | Re-exports generated types for ergonomics |

> Never hand-edit generated files. Run `./gradlew generateContracts` after editing any schema.

## Commands

```bash
# Generate artifacts + update lock file
./gradlew generateContracts

# Verify drift (runs during `./gradlew check`)
./gradlew verifyContracts

# Direct node entrypoint (rare)
npm run contracts:pipeline
```

## CI Integration

- `./gradlew check` now depends on `verifyContracts`; pipelines fail fast if schema fingerprints drift or generated TypeScript files are stale.
- Java compilation depends on `generateContracts`, ensuring up-to-date POJOs before building.

## Updating Schemas

1. Modify or add files under `schema/`.
2. Run `./gradlew generateContracts`.
3. Inspect `frontend/src/contracts/generated/` for expected changes.
4. Commit the schema, generated TypeScript files, and updated `schema/contracts.lock`.
5. Run `./gradlew verifyContracts` to confirm everything aligns before opening a PR.

## Troubleshooting

- **Missing TypeScript files:** Run `./gradlew generateContracts`. The verify step checks for presence and content.
- **Lock mismatch:** Ensure you committed the regenerated `schema/contracts.lock`. If hashes differ, regenerate.
- **Node not found:** Install Node.js 18+ and rerun. The pipeline relies on the repo-level `node_modules`.

Reach out in `#catams-dev` if additional languages or targets need support.

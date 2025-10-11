# Developer Tooling Hub

The `.devtools/` directory centralises assistant configurations, editor metadata, and other non-runtime tooling assets. Keeping these files here prevents root-level noise while keeping automation safe.

## Layout

- `ai/` – Per-assistant configuration (Claude, Gemini, Cursor, BMAD). These remain version-controlled so that Codex CLI and other AI workflows resolve consistently.
- `ai/.claude/`, `ai/.gemini/`, `ai/.cursor/` – Original directories relocated from the repository root without modification.
- Future categories (e.g., `linters/`, `editor/`) can live alongside `ai/` as needed.

## Guidelines

- Do not place runtime secrets or environment overrides here.
- Any automation that previously accessed `.claude`, `.gemini`, or `.cursor` at the root must be updated to reference `.devtools/ai/<name>/`.
- Document new tooling in `docs/WORKSPACE_STRUCTURE.md` and reference it from ADRs when the structure changes.

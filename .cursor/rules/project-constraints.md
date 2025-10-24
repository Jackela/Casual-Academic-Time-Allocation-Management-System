# Cursor AI - Project Constraints for CATAMS

## File System Rules

### ❌ FORBIDDEN Actions
1. Creating files in root directory except:
   - `.env` (environment variables)
   - `docker-compose.yml` (infrastructure)
   - `.gitignore`, `.dockerignore` (VCS config)
   - `README.md`, `CHANGELOG.md` (documentation)

2. Creating files with Windows reserved names:
   - CON, PRN, AUX, NUL, COM[1-9], LPT[1-9]
   - Use descriptive alternatives

3. Writing logs to root:
   - ✅ Use: `logs/backend-dev.log`
   - ❌ Never: `backend-dev.log`

### ✅ REQUIRED Actions

#### Log Management
All logging output MUST go to `logs/` directory:
```
logs/
├── backend-dev.log
├── backend-e2e.log
├── frontend-dev.log
├── frontend-e2e.log
├── test-ci.log
└── archived-root-logs/  # Historical cleanup
```

#### Directory Structure Compliance
- Backend code: `src/main/java/com/usyd/catams/`
- Frontend code: `frontend/src/`
- Scripts: `scripts/`
- Documentation: `docs/`
- Tests: `src/test/` (backend), `frontend/e2e/` (frontend)

## Code Generation Guidelines

### When suggesting new files:
1. Determine appropriate directory based on file type
2. Check existing patterns in that directory
3. Follow naming conventions (kebab-case for files, PascalCase for classes)
4. Update relevant documentation

### When running commands:
1. Prefix with directory context: `cd frontend && npm run dev`
2. Redirect logs properly: `npm run build 2>&1 | tee logs/build.log`
3. Clean up temp files after operations

## Integration with Build Tools

### Gradle (Backend)
- Build output: `build/` (git-ignored)
- Test results: `build/test-results/` (git-ignored)
- Logs: `logs/gradle-*.log`

### Vite (Frontend)
- Build output: `frontend/dist/` (git-ignored)
- Test results: `frontend/test-results/` (git-ignored)
- Logs: `logs/vite-*.log`

## Validation Checklist

Before completing any file operation:
- [ ] Target directory exists or will be created
- [ ] File path doesn't violate root directory rules
- [ ] Log output is redirected to `logs/`
- [ ] No Windows reserved filenames used
- [ ] Follows project structure conventions

## Emergency Recovery

If accidental root pollution occurs:
```bash
# Use migration script
bash scripts/migrate-root-logs.sh

# Verify cleanup
git status --short
```

## Reference Documentation
- Project structure: `docs/architecture/workspace-structure.md`
- Build system: `build.gradle.kts`, `frontend/vite.config.ts`
- Deployment: `docs/ops/deployment-guide.md`

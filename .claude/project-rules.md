# Claude Code Project Rules - CATAMS

## 🚫 Root Directory Protection Rules

### CRITICAL: Log File Management
- **NEVER** create log files in project root directory
- **ALWAYS** write logs to: `logs/` directory
- **NEVER** create files named: `CON`, `NUL`, `PRN`, `AUX`, `patch.tmp`

### Log File Routing Rules
```yaml
backend_logs:
  development: logs/backend-dev.log
  e2e: logs/backend-e2e.log
  production: logs/backend.log

frontend_logs:
  development: logs/frontend-dev.log
  e2e: logs/frontend-e2e.log
  build: logs/frontend-build.log

test_logs:
  ci: logs/test-ci.log
  unit: logs/test-unit.log
  integration: logs/test-integration.log
```

### File Creation Constraints
1. **Before creating ANY file**, verify target directory:
   - Scripts → `scripts/`
   - Logs → `logs/`
   - Docs → `docs/`
   - Config → root only if project-wide (e.g., `.env`, `docker-compose.yml`)

2. **Never create** temporary files in root:
   - Use `logs/temp/` for temporary outputs
   - Use `build/temp/` for build artifacts
   - Clean up temp files immediately after use

3. **Windows reserved names** are FORBIDDEN:
   - CON, PRN, AUX, NUL, COM1-9, LPT1-9
   - Use descriptive alternatives (e.g., `console-output.txt` instead of `CON`)

## 🔧 Code Generation Standards

### Backend (Spring Boot)
- Java package structure: `com.usyd.catams.*`
- Config files: `src/main/resources/application-*.yml`
- Logs: Use SLF4J, output to `logs/backend.log`

### Frontend (React + Vite)
- Component structure: Follow existing `src/components/` patterns
- Config files: `frontend/vite.config.ts`, `frontend/tsconfig.json`
- Build output: `frontend/dist/` (auto-ignored)

### Testing
- Backend: `src/test/java/com/usyd/catams/**`
- Frontend: `frontend/src/**/*.test.tsx`
- E2E: `frontend/e2e/**/*.spec.ts`
- Reports: `test-results/` (auto-ignored)

## 📝 Documentation Standards

### Update documentation when:
- Adding new API endpoints → `docs/backend/api-*.md`
- Modifying domain logic → `docs/architecture/*.md`
- Changing config → `docs/ops/deployment-guide.md`
- New features → `docs/product/release-notes.md`

### ADR (Architecture Decision Records)
- Create ADR for significant decisions: `docs/adr/####-title.md`
- Update index: `docs/adr/index.md`

## 🚀 Workflow Integration

### Before Running Commands
1. Check if logs directory exists: `mkdir -p logs`
2. Redirect output to appropriate log file
3. Use structured logging (JSON preferred)

### Example: Running Backend
```bash
# ✅ CORRECT
./gradlew bootRun > logs/backend-dev.log 2>&1

# ❌ WRONG
./gradlew bootRun > backend.log
```

### Example: Running Tests
```bash
# ✅ CORRECT
npm run test:e2e 2>&1 | tee logs/test-e2e.log

# ❌ WRONG
npm run test:e2e > e2e.log
```

## 🔍 Pre-Commit Checklist

Before suggesting commits:
1. [ ] No files created in root directory (except approved config files)
2. [ ] All logs written to `logs/` directory
3. [ ] No Windows reserved filenames
4. [ ] Documentation updated if needed
5. [ ] Tests pass locally

## 🛡️ Security Rules

- **NEVER** commit secrets or API keys
- Use `.env.example` for environment variable templates
- Actual `.env` files are git-ignored
- Sensitive config: `application-secrets.yml` (git-ignored)

## 📚 Reference

- Project structure: `docs/architecture/workspace-structure.md`
- Coding standards: `docs/architecture/coding-standards.md`
- API documentation: `docs/openapi.bundled.yaml`

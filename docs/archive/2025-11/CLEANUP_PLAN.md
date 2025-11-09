# Root Directory Cleanup and Pollution Prevention Plan

## Problem Analysis

### Current pollution in repository root
```
Root-level artifacts:
- backend.log, backend-dev.log, backend-e2e.log  (3.5MB+)
- frontend-dev.log, frontend-e2e.log
- testci.log
- CON, NUL, patch.tmp  (Windows reserved-name leftovers)
```

### Root causes
1. Build tools default output: Gradle/NPM sending logs to CWD
2. AI tool redirection: Claude/Cursor invoked without explicit log paths
3. Windows filesystem: reserved names (CON/NUL) accidentally created

---

## Solution Outline

### Phase 1: Immediate cleanup (~5 minutes)

#### Windows
```powershell
# Run migration script
powershell -ExecutionPolicy Bypass -File scripts\migrate-root-logs.ps1

# Verify cleanup
git status --short
```

#### Linux/macOS/Git Bash
```bash
# Run migration script
bash scripts/migrate-root-logs.sh

# Verify cleanup
git status --short
```

Expected staged changes:
```
M  .gitignore
A  scripts/migrate-root-logs.ps1
A  scripts/migrate-root-logs.sh
A  .claude/project-rules.md
A  .cursor/rules/project-constraints.md
```

---

### Phase 2: Prevent future pollution

#### 2.1 Git configuration
```bash
# Stage updated .gitignore
git add .gitignore

# Stage AI tooling constraint files
git add .claude/project-rules.md
git add .cursor/rules/project-constraints.md

# Stage migration scripts
git add scripts/migrate-root-logs.sh
git add scripts/migrate-root-logs.ps1

# Commit
git commit -m "chore: implement root directory pollution prevention

- Add comprehensive .gitignore rules for log files
- Prevent Windows reserved filenames (CON, NUL, etc.)
- Create migration scripts for historical cleanup
- Add AI coding tool constraints (.claude, .cursor)
- Establish log routing standards (all logs → logs/)

Closes: root directory cleanup initiative"
```

#### 2.2 AI tooling policy verification

Claude Code (.claude/project-rules.md):
- Prohibit creating logs in repository root
- Enforce routing all logs to `logs/`
- Forbid Windows reserved names
- Pre-commit checklist

Cursor (.cursor/rules/project-constraints.md):
- Filesystem constraints
- Log management standards
- Directory structure compliance checks

---

### Phase 3: Workflow updates

#### 3.1 Update package.json scripts (frontend/)
```bash
cd frontend
```

Ensure all NPM scripts redirect logs:
```json
{
  "scripts": {
    "dev": "vite 2>&1 | tee ../logs/frontend-dev.log",
    "build": "vite build 2>&1 | tee ../logs/frontend-build.log",
    "test:e2e": "playwright test 2>&1 | tee ../logs/frontend-e2e.log"
  }
}
```

#### 3.2 Update Gradle configuration (build.gradle.kts)

Add log routing:
```kotlin
tasks.bootRun {
    doFirst {
        project.file("logs").mkdirs()
        standardOutput = FileOutputStream("logs/backend-dev.log")
        errorOutput = FileOutputStream("logs/backend-dev.log")
    }
}
```

#### 3.3 Create logs directory initializer

scripts/init-logs-dir.sh:
```bash
#!/usr/bin/env bash
mkdir -p logs/{backend,frontend,test,temp,archived-root-logs}
touch logs/.gitkeep
echo "Logs directory structure initialized"
```

---

## Verification Checklist

### Automation script

scripts/verify-root-clean.sh:
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Verifying root directory cleanliness..."

# Check for log files in root
ROOT_LOGS=$(find . -maxdepth 1 -name "*.log" 2>/dev/null | wc -l)
if [ "$ROOT_LOGS" -gt 0 ]; then
  echo "FAIL: Found $ROOT_LOGS log file(s) in root"
  find . -maxdepth 1 -name "*.log"
  exit 1
fi

# Check for Windows reserved names
RESERVED=("CON" "NUL" "PRN" "AUX" "patch.tmp")
for name in "${RESERVED[@]}"; do
  if [ -f "$name" ]; then
    echo "FAIL: Found reserved filename: $name"
    exit 1
  fi
done

echo "PASS: Root directory is clean"
```

### Manual steps

1) Root directory check:
```bash
ls -la | grep -E '\\.(log|tmp)$|^CON$|^NUL$'
# Expect no output
```

2) Logs directory check:
```bash
ls -lh logs/
# Expect archived-root-logs/ and .gitkeep
```

3) .gitignore effectiveness:
```bash
echo "test" > test.log
git status --short | grep test.log
# Expect no output (ignored)
rm test.log
```

4) AI tooling constraints:
- Ask Claude to create a log file and verify it routes to `logs/`
- Ask to create temp files and verify it avoids repository root

---

## Ongoing Maintenance

### Weekly check (automate in CI)
```bash
# Add to .github/workflows/lint.yml
- name: Verify root directory cleanliness
  run: bash scripts/verify-root-clean.sh
```

### Quarterly review
1) Inspect size of `logs/archived-root-logs/`
2) Prune archives older than 90 days
3) Review `.gitignore` for new rules

### Onboarding
- Add this document to the onboarding checklist
- Emphasize log-routing standards
- Demonstrate migration script usage

---

## Execution Summary

### Immediate (required)
```bash
# 1) Clean up existing pollution
powershell -ExecutionPolicy Bypass -File scripts\\migrate-root-logs.ps1

# 2) Commit protection changes
git add .gitignore .claude/ .cursor/ scripts/migrate-root-logs.*
git commit -m "chore: implement root directory pollution prevention"

# 3) Verify
bash scripts/verify-root-clean.sh
```

### Follow-ups (recommended)
```bash
# 1) Update build scripts to redirect logs
# 2) Add CI verification
# 3) Team training and documentation
```

---

## References

- .gitignore best practices: https://git-scm.com/docs/gitignore
- Windows reserved names: https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file
- Project structure: `docs/architecture/workspace-structure.md`

---

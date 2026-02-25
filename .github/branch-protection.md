# Branch Protection Strategy

## Overview

This document describes the branch protection strategy for the CATAMS project, designed to ensure code quality and prevent accidental damage to the main branch.

## Why Branch Protection?

### Problem: Single Branch Development

```
❌ Risk Scenario:
- Developer A is working on Story 2.2 (50% complete)
- Critical bug discovered in Story 1.3
- Cannot deploy bug fix because main has unfinished code
- Production remains broken for hours
```

### Solution: Protected Main Branch

```
✅ Protected Scenario:
- Developer A works on feature/story-2.2 branch
- Critical bug found in Story 1.3
- Create hotfix/fix-story-1.3-bug from main
- Fix bug, merge via PR
- Deploy to production immediately
- Resume work on Story 2.2 independently
```

## Branch Protection Mechanisms

### 1. Local Git Hook (`.git/hooks/pre-push`)

**Purpose**: Prevent accidental push to main branch from local development

**Effectiveness**: 100% (cannot be bypassed without manual deletion)

**User Experience**:
```bash
$ git push origin main

╔════════════════════════════════════════════════════════════╗
║                    🚫 BRANCH PROTECTION                      ║
╠════════════════════════════════════════════════════════════╣
║  Direct push to 'main' branch is PROHIBITED!                ║
║                                                              ║
║  Please follow the Git Flow workflow:                       ║
║  1. Create a feature branch                                 ║
║  2. Make your changes                                       ║
║  3. Create a Pull Request                                   ║
║  4. Wait for CI tests to pass                               ║
║  5. Merge to main via GitHub                                ║
║                                                              ║
║  Example:                                                    ║
║    git checkout -b feature/your-feature-name                ║
║    # make changes                                            ║
║    git push origin feature/your-feature-name                ║
║    # Create PR on GitHub                                     ║
╚════════════════════════════════════════════════════════════╝

error: failed to push some refs to 'https://github.com/...'
```

**Installation**: Automatically installed when cloning repository

**Override** (not recommended):
```bash
rm .git/hooks/pre-push
```

### 2. GitHub Branch Protection (Remote)

**Purpose**: Enforce PR workflow even if local hook is bypassed

**Settings Applied**:
- ✅ Require pull request before merging
- ✅ Require status checks to pass (CI tests)
- ✅ Require linear history (no merge commits)
- ✅ Include administrators (no exceptions)
- ✅ Allow force pushes: OFF
- ✅ Allow deletions: OFF

**Setup Instructions**:

1. Go to repository Settings → Branches
2. Click "Add rule" for `main` branch
3. Configure:
   - Branch name pattern: `main`
   - ☑️ Require a pull request before merging
   - ☑️ Require status checks to pass before merging
     - Select: `backend`, `frontend-unit`
   - ☑️ Require linear history
   - ☑️ Include administrators
   - ☐ Allow force pushes
   - ☐ Allow deletions

**Effectiveness**: 100% (enforced by GitHub)

## Workflow Examples

### Standard Feature Development

```bash
# 1. Create feature branch
git checkout main
git pull origin main
git checkout -b feature/story-2.2-tutor-feedback

# 2. Develop feature
echo "// New code" > TimesheetFeedbackService.java
git add .
git commit -m "feat(story-2.2): implement tutor feedback workflow"

# 3. Push feature branch (allowed)
git push origin feature/story-2.2-tutor-feedback
# ✅ Success

# 4. Create Pull Request on GitHub
# 5. Wait for CI tests to pass
# 6. Merge to main
```

### Emergency Hotfix

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-bug

# 2. Fix the bug
echo "// Fix" > BugFix.java
git add .
git commit -m "fix: resolve critical production bug"

# 3. Push hotfix branch
git push origin hotfix/fix-critical-bug
# ✅ Success

# 4. Create PR, merge immediately after tests pass
```

### What Happens If You Try to Push to Main

```bash
# ❌ Attempting to push to main
git checkout main
echo "some changes" > file.txt
git add .
git commit -m "direct commit to main"
git push origin main

# Local hook blocks push:
🚫 BRANCH PROTECTION
Direct push to 'main' branch is PROHIBITED!

# If local hook removed:
# GitHub blocks push:
remote: error: GH006: Protected branch update failed for refs/heads/main
remote: error: Required status checks must pass before merging
```

## Benefits

### For AI Developers
- ✅ Prevents accidental code destruction
- ✅ Forces structured workflow
- ✅ Clear error messages guide correct behavior
- ✅ Self-documenting through PR template

### For Human Developers
- ✅ Safe to experiment on feature branches
- ✅ Code review enforced (even self-review)
- ✅ All changes tracked via PRs
- ✅ Easy rollback (just revert PR)

### For Project Quality
- ✅ Main branch always deployable
- ✅ CI tests must pass before merge
- ✅ Clean Git history (linear)
- ✅ Clear audit trail

## Troubleshooting

### Q: I accidentally committed to main. What do I do?

```bash
# Reset to before the commit
git reset HEAD~1

# Create feature branch
git checkout -b feature/my-feature

# Re-apply changes
git add .
git commit -m "feat: my feature"
git push origin feature/my-feature
```

### Q: I need to bypass protection for emergency. How?

**Short answer**: You can't (and shouldn't).

**Long answer**:
1. Create hotfix branch: `git checkout -b hotfix/...`
2. Make minimal fix
3. Push branch: `git push origin hotfix/...`
4. Create PR
5. Merge immediately

Total time: ~5 minutes (vs. hours/days of recovery if main breaks)

### Q: The hook is annoying. Can I remove it?

**Yes, but**:
```bash
# Remove hook (not recommended)
rm .git/hooks/pre-push
```

**However**:
- GitHub protection still enforces PR workflow
- You'll just get a different error message later
- Better to work with the system, not against it

### Q: Can I push to other branches?

**Yes!** Protection only applies to `main`:

```bash
git push origin feature/my-feature     # ✅ Allowed
git push origin bugfix/my-bugfix       # ✅ Allowed
git push origin experiment/my-test     # ✅ Allowed
git push origin main                   # ❌ Blocked
```

## Maintenance

### Reinstalling the Hook

If the hook is accidentally deleted:

```bash
# Download from repository
curl -o .git/hooks/pre-push https://raw.githubusercontent.com/.../pre-push

# Make executable
chmod +x .git/hooks/pre-push
```

### Updating Hook Script

When updating the hook script:

1. Edit `.git/hooks/pre-push`
2. Test with `git push origin main` (should fail)
3. Commit updated hook to repository
4. Document change in CHANGELOG.md

## Compliance

This branch protection policy applies to:
- ✅ All human developers
- ✅ All AI coding agents
- ✅ All automated scripts
- ✅ Project maintainers
- ✅ Administrators (no exceptions)

## Related Documents

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [Pull Request Template](.github/pull_request_template.md) - PR checklist
- [Architecture Decision Records](../docs/adr/) - Design decisions

---

**Last Updated**: 2026-02-25  
**Maintained By**: CATAMS Development Team  
**Enforcement**: Automatic (Git Hook + GitHub Protection)

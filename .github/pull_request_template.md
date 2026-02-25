# Pull Request

## 📝 Description
<!-- Clear description of what this PR does and why -->

## 🎯 Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 UI/UX improvement
- [ ] ♻️ Code refactoring
- [ ] ⚡ Performance improvement
- [ ] ✅ Test addition/update

## 🧪 Testing

### Automated Tests
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated (if applicable)

### Manual Testing
- [ ] Tested locally with `./gradlew test`
- [ ] Tested frontend with `npm --prefix frontend test`
- [ ] Tested E2E with `npm --prefix frontend run test:e2e` (if applicable)
- [ ] Verified all acceptance criteria met

### Test Results
<!-- Paste test results or link to CI run -->
```
Example:
Backend: 1366 tests passed ✅
Frontend: XX tests passed ✅
E2E: XX tests passed ✅
```

## 📋 Checklist

### Code Quality
- [ ] Code follows project coding standards (`docs/architecture/coding-standards.md`)
- [ ] No new warnings or errors introduced
- [ ] Code is self-documenting (Vibe Coding friendly)
- [ ] Complex logic has comments

### Documentation
- [ ] Updated API documentation (if endpoints changed)
- [ ] Updated user guide (if UI changed)
- [ ] Updated architecture docs (if structural changes)
- [ ] Added/updated inline code comments

### Security
- [ ] No sensitive data exposed (passwords, tokens, etc.)
- [ ] Input validation implemented
- [ ] Authentication/authorization checks in place
- [ ] No security vulnerabilities introduced

### Database
- [ ] Migration scripts tested
- [ ] Rollback plan documented (if applicable)
- [ ] No breaking schema changes (or documented)

## 🔗 Related Issues
<!-- Link to related issues or stories -->
Closes #
Related to #

## 📸 Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

### Before
<!-- Screenshot of current state -->

### After
<!-- Screenshot of new state -->

## 💭 Additional Notes
<!-- Any additional information for reviewers -->

## ⚠️ Breaking Changes
<!-- If this PR introduces breaking changes, describe them here -->

## 🚀 Deployment Notes
<!-- Any special deployment instructions or considerations -->

---

## For AI Developers (Vibe Coding)
- [ ] Variables and functions have semantic names
- [ ] Code structure is easy to understand
- [ ] No clever tricks that would confuse future AI readers
- [ ] Business logic is clearly separated from infrastructure

---

**By submitting this PR, I confirm:**
- I have tested these changes locally
- The code follows the project's coding standards
- I have updated relevant documentation
- I understand that merging requires passing all CI checks

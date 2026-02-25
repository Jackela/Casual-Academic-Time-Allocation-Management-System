# Contributing to CATAMS

This document provides guidelines for contributing to the Casual Academic Time Allocation Management System (CATAMS), including development setup, code style, testing requirements, and the pull request process.

## Branch Protection Policy ⭐ IMPORTANT

### Main Branch is Protected

The `main` branch is **PROTECTED** and direct pushes are **PROHIBITED**.

### Why?

- ✅ Prevents accidental code breaks
- ✅ Ensures all changes are tested via CI
- ✅ Maintains clean, traceable history
- ✅ Enables safe rollback of features
- ✅ Enforces code review (even self-review)

### Required Workflow

1. **Create Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Develop and Test**
   ```bash
   # Make changes
   ./gradlew test
   npm --prefix frontend test
   ```

3. **Push Feature Branch**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Go to GitHub
   - Create PR with template
   - Wait for CI tests to pass
   - Merge to main

### Branch Naming Convention

```
<type>/<ticket>-<description>
```

Types:
- `feature/` - New feature (e.g., `feature/story-2.2-tutor-feedback`)
- `bugfix/` - Bug fix (e.g., `bugfix/fix-login-error`)
- `hotfix/` - Critical production fix (e.g., `hotfix/security-vulnerability`)
- `refactor/` - Code refactoring (e.g., `refactor/dashboard-service`)
- `docs/` - Documentation only (e.g., `docs/api-documentation`)

### Local Git Hook

A pre-push hook is provided to prevent accidental pushes to main:

```bash
# Already installed at .git/hooks/pre-push
# If you need to reinstall:
chmod +x .git/hooks/pre-push
```

This hook will:
- Block direct pushes to `main`
- Display helpful error message
- Suggest creating feature branch

### Emergency Override

If you absolutely MUST push to main (not recommended):
```bash
# Skip the hook (requires manual deletion)
rm .git/hooks/pre-push
# Push to main
git push origin main
# Reinstall the hook
# Download from repository
```

**Note:** Even with local hook removed, GitHub branch protection still enforces PR workflow.

---

## Table of Contents

- [Branch Protection Policy](#branch-protection-policy) ⭐ NEW
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [E2E Environment](#e2e-environment)
- [E2E Guardrails](#e2e-guardrails-enforced)
- [Best Practices](#best-practices)
- [AI-Friendly Coding (Vibe Coding)](#ai-friendly-coding-vibe-coding)

---

## Development Setup

### Prerequisites

- **Java 21** - Backend runtime (LTS version)
- **Node.js 18+** - Frontend development
- **Gradle 8.7+** - Build automation (wrapper included)
- **PostgreSQL** - Production database (H2 available for testing)

### Backend Setup

1. Clone the repository and build:
   ```bash
   git clone https://github.com/your-org/Casual-Academic-Time-Allocation-Management-System.git
   cd Casual-Academic-Time-Allocation-Management-System
   ./gradlew build
   ```

2. Run the application:
   ```bash
   ./gradlew bootRun
   ```

3. Run tests:
   ```bash
   ./gradlew test                    # All tests
   ./gradlew test --tests '*UserTest'  # Specific test class
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend && npm ci
   ```

2. Start development server:
   ```bash
   npm run dev  # http://localhost:5174
   ```

3. Optional: Set up pre-commit hooks:
   ```bash
   pwsh scripts/setup-git-hooks.ps1
   ```

---

## Code Style Guidelines

### Java Code Style

- **Java 21** - Use modern Java features where appropriate
- **Spring Boot 3.2** - Follow Spring conventions

#### Package Structure

| Package | Purpose |
|---------|---------|
| `com.usyd.catams.entity` | JPA entities |
| `com.usyd.catams.repository` | Spring Data repositories |
| `com.usyd.catams.service` | Business logic services |
| `com.usyd.catams.controller` | REST controllers |
| `com.usyd.catams.application` | Application/facade layer |
| `com.usyd.catams.dto` | Data transfer objects |
| `com.usyd.catams.exception` | Custom exceptions |

#### Key Patterns

- **Entity equality**: Use id-based `equals()` and `hashCode()` with null-safety via `Objects.equals()` and `Objects.hash()`
- **Validation**: Use `Objects.requireNonNull()` for critical parameter validation at service entry points
- **Transactions**: Add `@Transactional(readOnly = true)` to read-only service methods
- **Exceptions**: Use domain-specific exceptions (`ResourceNotFoundException`, `BusinessRuleException`, `AuthorizationException`)
- **Error responses**: All errors return RFC-7807 `ProblemDetail` format via `GlobalExceptionHandler`

#### Naming Conventions

- **Classes**: PascalCase (e.g., `TimesheetApplicationService`)
- **Methods**: camelCase (e.g., `findPendingApprovals`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Packages**: lowercase (e.g., `com.usyd.catams.service`)

#### Documentation

- Add Javadoc to public classes and methods
- Include `@author` and `@since` tags for class-level documentation
- Document complex business logic with inline comments

### TypeScript/React Code Style

- Follow existing patterns in `frontend/src`
- Use TypeScript strict mode
- Components in PascalCase
- Use Tailwind CSS for styling

---

## Testing Requirements

### Backend Tests

- **Unit tests**: JUnit 5 with Mockito for service layer
- **Integration tests**: `@DataJpaTest` for repository tests
- **Test naming**: Use `@DisplayName` annotations with human-readable descriptions
- **Deterministic tests**: Avoid `Thread.sleep()` - use fixed timestamps or Clock injection

```bash
./gradlew test                    # All tests
./gradlew test --tests '*UserTest'  # Specific test class
./gradlew check                   # All checks including lint
```

### Frontend Tests

- **Unit tests**: Vitest with Testing Library
- **E2E tests**: Playwright

```bash
cd frontend
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:ai       # Full test pyramid
npm run lint          # Linting
```

### Test Coverage Requirements

- New features must include tests
- Bug fixes should include regression tests
- Aim for meaningful coverage, not just high percentages

---

## Pull Request Process

### Before Submitting

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Run all tests and checks**:
   ```bash
   ./gradlew check
   ./gradlew test
   cd frontend && npm run lint && npm run test
   ```

3. **Commit messages** follow conventional commits:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/changes
   - `chore:` - Build/tooling changes

### PR Requirements

1. **Title**: Clear, descriptive title summarizing the change
2. **Description**: Explain what and why (not just how)
3. **Tests**: All tests must pass
4. **Documentation**: Update docs if behavior changes
5. **Small scope**: Keep PRs focused and reviewable

### Review Process

1. At least one approval required
2. All CI checks must pass
3. Resolve all review comments
4. Squash and merge when approved

---

## E2E Environment

Real E2E uses environment variables. Copy and fill the example:

- `frontend/e2e/real/.env.example`

Required variables:

- `BASE_URL`
- `E2E_LECTURER_EMAIL`, `E2E_LECTURER_PASSWORD`
- `E2E_TUTOR_EMAIL`, `E2E_TUTOR_PASSWORD`
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`

Do not commit secrets. Use your shell env or CI secrets.

Quick preflight (local/CI):
```bash
cd frontend && node scripts/e2e-preflight.cjs
```
- Verifies `BASE_URL`/`E2E_FRONTEND_URL` and all role credentials are set
- Checks the deployed frontend is reachable

---

## E2E Guardrails (enforced)

- ESLint override for `frontend/e2e/real/**`:
  - Disallow `.only` in tests/suites
  - Disallow `page.waitForTimeout(..)`
  - Warn on very large functions and deep nesting
- Pre-commit hook checks (optional, via `scripts/setup-git-hooks.ps1`):
  - Blocks `.only` and `waitForTimeout` from being committed in real E2E
  - Warns if a spec under `e2e/real/specs/` is missing a priority tag like `@p0`/`@p1`
  - Blocks `page.route(...)` network interception; tests must exercise the real backend

---

## Best Practices

- Use `data-testid` selectors exclusively; avoid brittle CSS/XPath
- Prefer programmatic login; UI login only in smoke
- Keep specs thin: actions in Page Objects, assertions in helpers
- Contract-first: assert request/response shape via OpenAPI helpers
- Tag tests by priority (`@p0`, `@p1`) and domain (`@admin`, `@timesheet`)
- Record flake sources in `frontend/e2e/real/fixtures/flake-log.md`

---

## CI

- Lint and typecheck always run
- Real E2E P0 runs when `BASE_URL` and user secrets are provided
- Playwright HTML report uploaded as artifact on failure

---

## AI-Friendly Coding (Vibe Coding)

This project follows **Vibe Coding** principles to ensure code is maintainable by both human and AI developers.

### Core Principles

#### 1. Self-Documenting Code
```java
// ✅ Good - Semantic names, clear intent
public BigDecimal calculateTotalTutorHours(Long tutorId, LocalDate startDate, LocalDate endDate) {
    List<Timesheet> timesheets = timesheetRepository.findByTutorIdAndSessionDateBetween(
        tutorId, startDate, endDate
    );
    return timesheets.stream()
        .map(Timesheet::getDeliveryHours)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
}

// ❌ Bad - Unclear abbreviations, needs comments to understand
public BigDecimal calcHrs(Long id, LocalDate s, LocalDate e) {
    List<T> ts = repo.find(id, s, e);
    return ts.stream().map(t -> t.getH()).reduce(BigDecimal.ZERO, BigDecimal::add);
}
```

#### 2. Explicit Over Implicit
```java
// ✅ Good - Explicit dependencies
@Service
public class TimesheetService {
    private final TimesheetRepository timesheetRepository;
    private final Schedule1Calculator calculator;
    private final ApprovalService approvalService;
    
    public TimesheetService(TimesheetRepository timesheetRepository,
                           Schedule1Calculator calculator,
                           ApprovalService approvalService) {
        this.timesheetRepository = timesheetRepository;
        this.calculator = calculator;
        this.approvalService = approvalService;
    }
}
```

#### 3. Structured Code
```java
// ✅ Good - Clear layers
@RestController
class TimesheetController {
    @PostMapping("/api/timesheets")
    ResponseEntity<TimesheetResponse> createTimesheet(@Valid @RequestBody TimesheetCreateRequest request) {
        // Controller: thin, just orchestration
        return ResponseEntity.ok(timesheetService.createTimesheet(request));
    }
}

@Service
class TimesheetService {
    TimesheetResponse createTimesheet(TimesheetCreateRequest request) {
        // Service: business logic
        validateRequest(request);
        Timesheet timesheet = buildTimesheet(request);
        return timesheetRepository.save(timesheet);
    }
}
```

#### 4. Meaningful Comments
```java
// ✅ Good - Comment explains WHY, not WHAT
public void approveTimesheet(Long timesheetId) {
    Timesheet timesheet = findById(timesheetId);
    
    // Prevent double-approval race condition using optimistic locking
    // @Version annotation on entity ensures concurrent modification check
    if (timesheet.getStatus() != ApprovalStatus.PENDING_LECTURER_APPROVAL) {
        throw new BusinessRuleException("Timesheet already processed");
    }
    
    timesheet.setStatus(ApprovalStatus.LECTURER_CONFIRMED);
    timesheetRepository.save(timesheet);
}
```

### AI Developer Guidelines

When writing code in this project:

1. **Use Full Names**: Avoid abbreviations (`tutorId` not `tid`)
2. **One Concept Per Method**: Keep methods focused
3. **Avoid Clever Tricks**: Prefer readable code over clever one-liners
4. **Document Complex Logic**: Add comments for non-obvious business rules
5. **Follow Existing Patterns**: Look at similar code in the codebase
6. **Keep It Simple**: Simple code is easier for both humans and AI to maintain

### Example: Full Vibe Coding Implementation

```java
/**
 * Calculates and persists timesheet with Schedule 1 EA compliance.
 * 
 * <p>This method ensures that all timesheets are calculated using the 
 * authoritative Schedule1Calculator before persistence, following the 
 * Single Source of Truth (SSOT) principle.</p>
 * 
 * @param request the minimal input data from frontend
 * @return fully calculated and persisted timesheet
 * @throws BusinessRuleException if validation fails
 */
@Service
@Transactional
public class TimesheetApplicationService {
    
    private final TimesheetRepository timesheetRepository;
    private final Schedule1Calculator schedule1Calculator;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    
    public TimesheetResponse createTimesheet(TimesheetCreateRequest request) {
        // Step 1: Validate references exist
        User tutor = userRepository.findById(request.getTutorId())
            .orElseThrow(() -> new ResourceNotFoundException("Tutor not found"));
        
        Course course = courseRepository.findById(request.getCourseId())
            .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        
        // Step 2: Calculate EA-compliant hours and pay
        Schedule1CalculationResult calculation = schedule1Calculator.calculate(
            request.getTaskType(),
            request.getSessionDate(),
            request.getDeliveryHours(),
            request.isRepeat(),
            request.getQualification()
        );
        
        // Step 3: Build and persist timesheet
        Timesheet timesheet = Timesheet.builder()
            .tutor(tutor)
            .course(course)
            .sessionDate(request.getSessionDate())
            .taskType(request.getTaskType())
            .qualification(request.getQualification())
            .repeat(calculation.isEffectiveRepeat())
            .deliveryHours(request.getDeliveryHours())
            .associatedHours(calculation.getAssociatedHours())
            .payableHours(calculation.getPayableHours())
            .hourlyRate(calculation.getHourlyRate())
            .amount(calculation.getPayableAmount())
            .rateCode(calculation.getRateCode())
            .formula(calculation.getFormula())
            .clauseReference(calculation.getClauseReference())
            .status(ApprovalStatus.DRAFT)
            .description(request.getDescription())
            .build();
        
        Timesheet saved = timesheetRepository.save(timesheet);
        
        log.info("Created timesheet {} for tutor {} in course {}", 
            saved.getId(), tutor.getId(), course.getId());
        
        return TimesheetResponse.from(saved);
    }
}
```

### Why This Matters

- **AI Developers** can understand and modify code safely
- **Human Developers** can onboard faster
- **Code Reviewers** can focus on logic, not decoding
- **Future Maintainers** (human or AI) can work independently

---

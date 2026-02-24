# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Quality Improvement Sprint 1] - 2026-02-19

### Security
- **US-SEC-001**: Configured HikariCP connection pool with explicit settings (maximum-pool-size=20, minimum-idle=5, idle-timeout=30000) for predictable production performance.
- **US-SEC-002**: Restricted CORS allowed headers to specific list (Accept, Content-Type, Authorization, X-Requested-With, X-Trace-Id) to prevent overly permissive API access.

### Performance
- **US-PERF-001**: Optimized `Timesheet.getLastApproval()` from O(n) to O(1) by replacing `reduce()` with direct list access.
- **US-PERF-002**: Added `@EntityGraph(attributePaths = {"approvals"})` to `TimesheetRepository.findById()` to prevent N+1 queries.

### Architecture
- **US-ARCH-001**: Added `@Version` field to `TimesheetJpaEntity` for optimistic locking support.
- **US-ARCH-002**: Added `@Version` field to `Course` entity for optimistic locking support.

### Code Quality
- **US-CQ-001**: Created `TimesheetValidationService` interface in domain/service package for separated validation logic.
- **US-CQ-002**: Implemented `TimesheetValidationServiceImpl` using `TimesheetValidationProperties` to eliminate magic numbers.
- **US-CQ-003**: Created `BusinessRuleException` for domain-specific error handling.
- **US-CQ-004**: Added `BusinessRuleException` handler to `GlobalExceptionHandler` with 400 status and proper error response.

### Testing
- **US-TEST-001**: Added rate limiting threshold test to `RateLimitingFilterTest` verifying behavior at exactly 100 requests.
- **US-TEST-002**: Fixed `UserEntityTest` timestamp test using `Clock.fixed()` for deterministic time-dependent tests.

### Documentation
- **US-DOC-001**: Added comprehensive Javadoc to `TimesheetController` public methods with @param, @return, @throws annotations.
- **US-DOC-002**: Added comprehensive Javadoc to `ApprovalController` public methods with @param, @return, @throws annotations.
- **US-DOC-003**: Created API overview documentation at `docs/api/README.md` including authentication flow and rate limiting sections.

---

## Sprint Summary

| Category | Stories |
|----------|---------|
| Security | 2 |
| Performance | 2 |
| Architecture | 2 |
| Code Quality | 4 |
| Testing | 2 |
| Documentation | 3 |
| **Total** | **15** |

All 15 stories completed with passing tests and quality checks.

---

## [Quality Improvement Sprint 2] - 2026-02-23

### Code Quality - Entity Equality
- **US-001**: Added proper `equals()` and `hashCode()` to `Timesheet` entity using null-safe ID comparison.
- **US-002**: Added proper `equals()` and `hashCode()` to `Course` entity using null-safe ID comparison.
- **US-003**: Added proper `equals()` and `hashCode()` to `Approval` entity using null-safe ID comparison.
- **US-004**: Added proper `equals()` and `hashCode()` to `TutorAssignment` entity using null-safe ID comparison.
- **US-005**: Added proper `equals()` and `hashCode()` to `LecturerAssignment` entity using null-safe ID comparison.

### Documentation - Javadoc
- **US-006**: Added comprehensive Javadoc to `TimesheetsConfigController` with @author, @since, and method documentation.
- **US-007**: Added comprehensive Javadoc to `CourseUsersController` with @author, @since, and method documentation.
- **US-008**: Added Javadoc to `TestDataResetController` and `TestDataSeedController` noting testing-only purpose.
- **US-009**: Added Javadoc to `TutorAssignment` entity explaining tutor-course relationship.
- **US-010**: Added Javadoc to `LecturerAssignment` entity explaining lecturer-course relationship.
- **US-011**: Added Javadoc to `Approval` entity explaining approval workflow state machine.
- **US-012**: Added Javadoc to `TutorProfileDefaults` entity explaining default settings.

### Code Quality - Null Safety
- **US-013**: Added null-safe comparisons using `Objects.equals()` in `UserApplicationService`.
- **US-014**: Added `@NonNull` annotations and `Objects.requireNonNull()` in `UserApplicationService`.

### Skipped Stories (Target Files Don't Exist)
- **US-015**: Skipped - `CourseServiceImpl.java` doesn't exist in codebase.
- **US-017**: Skipped - `TimesheetServiceImpl.java` doesn't exist in codebase.
- **US-025**: Skipped - `RateLimitExceededException` doesn't exist in codebase.

### Testing - Application Service Tests
- **US-016**: Added `@Transactional(readOnly=true)` to read-only methods in `UserServiceImpl`.
- **US-018**: Created `ApprovalApplicationServiceTest` with Mockito setup and basic structure.
- **US-019**: Added approval workflow tests (approve, reject, request modification).
- **US-020**: Added error scenario tests for invalid state transitions and unauthorized access.
- **US-021**: Created `TimesheetApplicationServiceTest` with Mockito setup.
- **US-022**: Added CRUD operation tests for timesheets.
- **US-023**: Added permission and validation tests for timesheet operations.
- **US-024**: Added exception tests to `GlobalExceptionHandlerTest` for RFC-7807 compliance.

### Testing - Test Refactoring
- **US-026**: Replaced `Thread.sleep()` with deterministic timestamps in `TimesheetRepositoryTest`.
- **US-027**: Replaced `Thread.sleep()` with deterministic timestamps in `UserTest`.

### Documentation
- **US-028**: Created `CONTRIBUTING.md` with development setup, code style, testing requirements, and PR process.
- **US-029**: Added `@DisplayName` annotations to entity test classes.
- **US-030**: Added `@DisplayName` annotations to repository test classes.

---

## Sprint 2 Summary

| Category | Stories |
|----------|---------|
| Entity Equality | 5 |
| Javadoc Documentation | 7 |
| Null Safety | 2 |
| Transactional Annotations | 2 (1 skipped) |
| Application Service Tests | 7 |
| Test Refactoring | 2 |
| Documentation | 3 |
| **Total Completed** | **27** |
| **Skipped** | **3** |
| **Grand Total** | **30** |

All 27 target stories completed with passing tests. 3 stories properly skipped (target files don't exist).

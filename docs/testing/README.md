# CATAMS Testing Guide

This document provides comprehensive guidance for the CATAMS testing infrastructure, including the new API-first testing methodology, TestContainers integration, and performance testing framework.

## Testing Architecture Overview

The CATAMS project follows a three-tier testing strategy:

```
┌─────────────────────────────────────────┐
│             Testing Pyramid             │
├─────────────────────────────────────────┤
│  Performance Tests (Load/Stress)       │  <- API Performance & SLA
├─────────────────────────────────────────┤
│  Contract Tests (API Compliance)       │  <- HTTP/OpenAPI Validation
├─────────────────────────────────────────┤
│  Integration Tests (Full Stack)        │  <- TestContainers + Database
├─────────────────────────────────────────┤
│  Unit Tests (Business Logic)           │  <- Service Layer Testing
└─────────────────────────────────────────┘
```

## Test Types and Structure

### 1. Unit Tests (`src/test/java/com/usyd/catams/unit/`)
- **Purpose**: Test business logic in isolation
- **Technology**: JUnit 5 + Mockito
- **Database**: Mocked
- **Speed**: Very Fast (< 100ms per test)
- **Example**: `TimesheetServiceUnitTest.java`

**Usage:**
```bash
mvn test -Dtest="*UnitTest"
```

### 2. Integration Tests (`src/test/java/com/usyd/catams/integration/`)
- **Purpose**: Test full application stack with real database
- **Technology**: JUnit 5 + TestContainers + PostgreSQL
- **Database**: Real PostgreSQL container
- **Speed**: Medium (1-5s per test)
- **Example**: `TimesheetWorkflowIntegrationTest.java`

**Requirements:**
- Docker must be installed and running
- PostgreSQL TestContainer will be started automatically

**Usage:**
```bash
mvn test -Dtest="*IntegrationTest"
```

### 3. Contract Tests (`src/test/java/com/usyd/catams/contract/`)
- **Purpose**: Validate HTTP API compliance and OpenAPI specifications
- **Technology**: JUnit 5 + OpenAPI Validator + MockMvc
- **Database**: H2 in-memory (focused on HTTP layer)
- **Speed**: Medium (500ms-2s per test)
- **Example**: `TimesheetApiContractTest.java`

**Usage:**
```bash
mvn test -Dtest="*ContractTest"
```

### 4. Performance Tests (`src/test/java/com/usyd/catams/performance/`)
- **Purpose**: Validate API performance and establish SLA baselines
- **Technology**: JUnit 5 + TestContainers + Micrometer
- **Database**: Real PostgreSQL container
- **Speed**: Slow (10-60s per test)
- **Example**: `ApiPerformanceTest.java`

**Requirements:**
- Docker must be installed and running
- Sufficient system resources for load testing

**Usage:**
```bash
mvn test -Dtest="*PerformanceTest"
```

## Key Testing Infrastructure

### TestDataBuilder Pattern
Provides consistent, fluent test data creation across all test types:

```java
// Create test entities
User lecturer = TestDataBuilder.aLecturer()
    .email("test@university.edu")
    .name("Test Lecturer")
    .build();

Course course = TestDataBuilder.aCourse()
    .code("TEST101")
    .lecturer(lecturer)
    .build();

// Create test requests
TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
    .tutorId(tutor.getId())
    .courseId(course.getId())
    .hours(new BigDecimal("10.5"))
    .build();
```

### Base Test Classes

#### IntegrationTestBase
- Provides TestContainers PostgreSQL database
- Real Spring Boot application context
- HTTP testing utilities via MockMvc
- JWT authentication helpers

#### ApiTestBase (Contract Tests)
- OpenAPI schema validation
- HTTP compliance testing
- Standardized API response assertions
- JWT token management

#### PerformanceTestBase
- Load testing framework
- Response time measurement
- Performance threshold validation
- Concurrent user simulation

## Performance Testing

### Performance Thresholds
The system maintains the following SLA targets:

| Operation Type | Average Response Time | P95 Response Time | Success Rate |
|---|---|---|---|
| Authentication | 500ms | 1000ms | > 95% |
| CRUD Operations | 200ms | 400ms | > 95% |
| List Operations | 300ms | 600ms | > 95% |
| Search Operations | 400ms | 800ms | > 95% |

### Running Performance Benchmarks
```bash
# Run all performance tests
mvn test -Dtest="*PerformanceTest"

# Run specific performance test
mvn test -Dtest="ApiPerformanceTest#testAuthenticationPerformance"

# Run with custom parameters
mvn test -Dtest="*PerformanceTest" -Dtest.performance.concurrent-users=20
```

### Performance Configuration
Configure performance testing in `application-integration-test.yml`:

```yaml
test:
  performance:
    response-time:
      auth: 500        # Authentication endpoints (ms)
      crud: 200        # CRUD operations (ms)
      list: 300        # List operations (ms)
      search: 400      # Search operations (ms)
    concurrent-users: 10
    test-duration: 30s
    warmup-duration: 5s
```

## Running Tests

### Node-based Orchestration (Recommended, cross-platform)

Use the project's Node scripts to run tests in a layered, reproducible way (no PowerShell piping). All scripts read from Single Source of Truth configs: `scripts/test.params.json` and `frontend/scripts/e2e.params.json`.

Commands (from project root):

```bash
# Preflight: Java/Gradle/Docker/ports readiness
node scripts/preflight.js

# Backend
node scripts/test-backend-unit.js         # Unit tests only (profile=test)
node scripts/test-backend-integration.js  # Integration tests (Testcontainers)

# Frontend
node scripts/test-frontend-unit.js        # Vitest unit/component tests
node scripts/test-frontend-contract.js    # API/contract/schema tests
node scripts/test-frontend-e2e.js         # Playwright E2E (desktop UI project)

# Full layered pipeline (stop on first failure)
node scripts/test-all.js
```

E2E local iteration (fast re-runs):

```bash
# Start backend once (e2e profile) and keep running
node scripts/start-backend-e2e.js

# Re-run Playwright reusing backend (desktop UI only)
node scripts/run-e2e.js --project=ui --nostart

# Cleanup when done
node scripts/cleanup-ports.js
```

Notes:
- E2E reports are saved under `frontend/playwright-report/` (HTML/JUnit/trace) and `frontend/test-results/` (artifacts per failure).
- Ports, backend profile, and timeouts are read from `frontend/scripts/e2e.params.json` (no hard-coded values).

### Prerequisites
1. **Java 21+** installed
2. **Maven 3.6+** installed
3. **Docker** installed and running (for integration and performance tests)

### Test Execution Commands

```bash
# Run all tests
mvn test

# Run tests by type
mvn test -Dtest="*UnitTest"           # Unit tests only
mvn test -Dtest="*IntegrationTest"    # Integration tests only
mvn test -Dtest="*ContractTest"       # Contract tests only
mvn test -Dtest="*PerformanceTest"    # Performance tests only

# Run specific test class
mvn test -Dtest="TimesheetServiceUnitTest"

# Run specific test method
mvn test -Dtest="TimesheetServiceUnitTest#createTimesheet_LecturerForOwnCourse_ShouldSucceed"

# Run tests with specific profile
mvn test -Dspring.profiles.active=integration-test

# Generate test coverage report (includes all test types)
mvn test jacoco:report
```

### CI/CD Pipeline Integration

#### GitHub Actions Example
```yaml
name: CATAMS Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '21'
      - run: mvn test -Dtest="*UnitTest"

  integration-tests:
    runs-on: ubuntu-latest
    services:
      docker:
        image: docker:dind
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '21'
      - run: mvn test -Dtest="*IntegrationTest"

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    services:
      docker:
        image: docker:dind
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '21'
      - run: mvn test -Dtest="*PerformanceTest"
      - uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: target/performance-report-*.txt
```

## Test Data Management

### Database State Management
- **Unit Tests**: No database (mocked)
- **Contract Tests**: H2 in-memory database (reset per test class)
- **Integration Tests**: PostgreSQL TestContainer (reset per test class)
- **Performance Tests**: PostgreSQL TestContainer (persistent during test)

### Test Isolation
All tests are designed to be:
- **Independent**: Can run in any order
- **Repeatable**: Same results every time
- **Fast**: Optimized for quick feedback
- **Reliable**: No flaky tests due to timing or external dependencies

## Troubleshooting

### Common Issues

#### Docker Not Available
```
IllegalStateException: Could not find a valid Docker environment
```
**Solution**: Ensure Docker is installed and running. For CI/CD, use `services: docker` in GitHub Actions.

#### TestContainers Permission Errors
**Solution**: Ensure the user has permission to run Docker containers.

#### Performance Test Failures
**Solution**: Check system resources. Performance tests require adequate CPU and memory.

#### OpenAPI Validation Failures
**Solution**: Ensure OpenAPI spec file exists at `docs/openapi.yaml` or tests will run without schema validation.

### Test Debugging

#### Enable Debug Logging
```bash
mvn test -Dtest="TestClassName" -Dlogging.level.com.usyd.catams=DEBUG
```

#### View TestContainers Logs
```bash
mvn test -Dtest="IntegrationTest" -Dlogging.level.org.testcontainers=DEBUG
```

#### Performance Test Debugging
```bash
mvn test -Dtest="*PerformanceTest" -Dtest.performance.concurrent-users=1
```

## Best Practices

### Writing Unit Tests
1. Use `@ExtendWith(MockitoExtension.class)`
2. Mock all external dependencies
3. Focus on business logic
4. Use descriptive test names
5. Follow AAA pattern (Arrange, Act, Assert)

### Writing Integration Tests
1. Extend `IntegrationTestBase`
2. Use real database operations
3. Test complete workflows
4. Verify data persistence
5. Clean up test data in `@BeforeEach`

### Writing Contract Tests
1. Extend `ApiTestBase`
2. Focus on HTTP compliance
3. Validate response schemas
4. Test error conditions
5. Use OpenAPI validation

### Writing Performance Tests
1. Extend `PerformanceTestBase`
2. Include warmup phase
3. Test realistic load patterns
4. Validate SLA compliance
5. Generate performance reports

## Test Coverage

### Coverage Targets
- **Unit Tests**: > 90% line coverage for service layer
- **Integration Tests**: > 80% end-to-end workflow coverage
- **Contract Tests**: 100% API endpoint coverage
- **Performance Tests**: 100% critical path coverage

### Generating Coverage Reports
```bash
mvn test jacoco:report
open target/site/jacoco/index.html
```

## Continuous Improvement

### Performance Monitoring
- Track performance trends over time
- Set up alerts for performance regressions
- Use performance reports in code reviews

### Test Suite Optimization
- Monitor test execution times
- Parallelize slow tests when possible
- Optimize TestContainer startup times
- Use test data efficiently

### Quality Gates
- All tests must pass before merge
- Performance tests run on main branch
- Coverage thresholds enforced
- No flaky tests tolerated
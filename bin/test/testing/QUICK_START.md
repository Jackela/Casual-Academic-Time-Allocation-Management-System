# CATAMS Testing Quick Start Guide

## TL;DR - Run Tests

```bash
# Run all unit tests (fast, no Docker required)
mvn test -Dtest="*UnitTest"

# Run all tests including integration (requires Docker)
mvn test

# Run specific test
mvn test -Dtest="TimesheetServiceUnitTest"

# Run EA Schedule 1 calculator + policy tests
./gradlew test --tests "*Schedule1*Test"
```

## Cleanup between runs (recommended)

When tests are interrupted or fail early, development ports or helper processes may linger (Vite/Node/Gradle). Before re-running tests, clean up cross-platform:

```bash
node scripts/cleanup-ports.js             # frees common E2E/dev ports
node scripts/cleanup-ports.js --ports=8084,5174  # or specify ports
```

## Test Structure Overview

```
src/test/java/com/usyd/catams/
├── unit/                    # Unit tests (mocked dependencies)
├── integration/            # Full-stack tests (TestContainers)
├── contract/              # API compliance tests (OpenAPI)
├── performance/           # Load & performance tests
└── testdata/              # Shared test data builders
```

## Quick Test Commands

| Test Type | Command | Requirements | Speed |
|-----------|---------|--------------|-------|
| Unit | `mvn test -Dtest="*UnitTest"` | None | Fast (seconds) |
| EA Calculator | `./gradlew test --tests "*Schedule1*Test"` | None | Fast (seconds) |
| Integration | `mvn test -Dtest="*IntegrationTest"` | Docker | Medium (minutes) |
| Contract | `mvn test -Dtest="*ContractTest"` | None | Medium |
| Performance | `mvn test -Dtest="*PerformanceTest"` | Docker | Slow (minutes) |
| All | `mvn test` | Docker | Full suite |

## Creating Test Data

Use the TestDataBuilder pattern for consistent test data:

```java
// Users
User lecturer = TestDataBuilder.aLecturer().build();
User tutor = TestDataBuilder.aTutor().build();

// Courses  
Course course = TestDataBuilder.aCourse()
    .lecturer(lecturer)
    .build();

// Requests
TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
    .tutorId(tutor.getId())
    .courseId(course.getId())
    .build();
```

## Test Base Classes

| Base Class | Use For | Provides |
|------------|---------|-----------|
| None | Unit tests | Clean isolation |
| `IntegrationTestBase` | Full-stack tests | TestContainers DB |
| `ApiTestBase` | API contract tests | OpenAPI validation |
| `PerformanceTestBase` | Load tests | Metrics & thresholds |

## Common Test Patterns

### Unit Test Example
```java
@ExtendWith(MockitoExtension.class)
class ServiceUnitTest {
    @Mock private Repository repository;
    @InjectMocks private Service service;
    
    @Test
    void shouldDoSomething() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        
        // Act
        Result result = service.doSomething(1L);
        
        // Assert
        assertThat(result).isNotNull();
        verify(repository).findById(1L);
    }
}
```

### Integration Test Example
```java
class WorkflowIntegrationTest extends IntegrationTestBase {
    @Test
    void shouldCompleteWorkflow() throws Exception {
        // Act & Assert
        performPost("/api/endpoint", request, authToken)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists());
    }
}
```

## Test Profiles

| Profile | Purpose | Database |
|---------|---------|----------|
| `test` | Default unit tests | H2 in-memory |
| `integration-test` | Integration/Performance | PostgreSQL container |

## Performance Thresholds

- **Authentication**: 500ms average
- **CRUD Operations**: 200ms average  
- **List Operations**: 300ms average
- **Search Operations**: 400ms average

## Troubleshooting

### Docker Issues
```bash
# Check Docker is running
docker ps

# If Docker not available, run unit tests only
mvn test -Dtest="*UnitTest"
```

### Debug Failed Tests
```bash
# Run with debug logging
mvn test -Dtest="TestName" -Dlogging.level.com.usyd.catams=DEBUG

# Run single test method
mvn test -Dtest="TestClass#testMethod"
```

### View Test Coverage
```bash
mvn test jacoco:report
open target/site/jacoco/index.html
```

## Writing New Tests

### 1. Unit Test Checklist
- [ ] Extends no base class
- [ ] Uses `@ExtendWith(MockitoExtension.class)`
- [ ] Mocks all dependencies
- [ ] Tests business logic only
- [ ] Runs in < 100ms

### 2. Integration Test Checklist
- [ ] Extends `IntegrationTestBase`
- [ ] Tests full request/response cycle
- [ ] Uses real database
- [ ] Cleans up test data
- [ ] Verifies data persistence

### 3. Contract Test Checklist
- [ ] Extends `ApiTestBase`
- [ ] Tests HTTP compliance
- [ ] Validates response format
- [ ] Tests error conditions
- [ ] Uses OpenAPI validation

### 4. Performance Test Checklist
- [ ] Extends `PerformanceTestBase`
- [ ] Includes warmup phase
- [ ] Tests realistic load
- [ ] Validates thresholds
- [ ] Generates reports

## File Templates

### Unit Test Template
```java
@ExtendWith(MockitoExtension.class)
@DisplayName("Service Unit Tests")
class ServiceUnitTest {
    @Mock private Repository repository;
    @InjectMocks private Service service;
    
    @Test
    @DisplayName("Should handle valid input")
    void shouldHandleValidInput() {
        // Arrange, Act, Assert
    }
}
```

### Integration Test Template
```java
@DisplayName("Workflow Integration Tests")
class WorkflowIntegrationTest extends IntegrationTestBase {
    
    @BeforeEach
    void setupTestData() {
        // Create test data
    }
    
    @Test
    @DisplayName("Should complete end-to-end workflow")
    void shouldCompleteWorkflow() throws Exception {
        // HTTP request/response testing
    }
}
```

## Next Steps

1. Read the full [Testing Guide](README.md) for comprehensive details
2. Review existing test examples in each test directory
3. Set up your IDE to run tests with appropriate profiles
4. Configure Docker for integration and performance testing

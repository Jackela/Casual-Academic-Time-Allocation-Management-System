# Developer Guide - TimesheetPermissionPolicy Pattern

**Purpose**: Comprehensive guide for developers working with the TimesheetPermissionPolicy authorization framework

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Using the Policy in Your Code](#using-the-policy-in-your-code)
4. [Understanding Authorization Methods](#understanding-authorization-methods)
5. [Testing with the Policy](#testing-with-the-policy)
6. [Extending the Policy](#extending-the-policy)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Quick Start

### Basic Usage in Application Service

```java
@Service
@Transactional
public class TimesheetApplicationService {
    
    private final TimesheetPermissionPolicy permissionPolicy;
    
    public TimesheetApplicationService(TimesheetPermissionPolicy permissionPolicy) {
        this.permissionPolicy = permissionPolicy; // Spring auto-injection
    }
    
    public Timesheet createTimesheet(User creator, User tutor, Course course, 
                                   LocalDate startDate, LocalDate endDate) {
        // 1. Authorization check BEFORE business logic
        if (!permissionPolicy.canCreateTimesheetFor(creator, tutor, course)) {
            throw new SecurityException("User not authorized to create timesheet for this tutor and course");
        }
        
        // 2. Business logic continues...
        Timesheet timesheet = new Timesheet(tutor, course, startDate, endDate);
        return timesheetRepository.save(timesheet);
    }
}
```

### Basic Usage in REST Controller

```java
@RestController
@RequestMapping("/api/timesheets")
public class TimesheetController {
    
    private final TimesheetService timesheetService;
    private final TimesheetPermissionPolicy permissionPolicy;
    
    @GetMapping("/{id}")
    public ResponseEntity<TimesheetDto> getTimesheet(@PathVariable Long id, 
                                                   Authentication authentication) {
        User user = getCurrentUser(authentication);
        Timesheet timesheet = timesheetService.getById(id);
        Course course = courseService.getByCourseId(timesheet.getCourseId());
        
        // Authorization check
        if (!permissionPolicy.canViewTimesheet(user, timesheet, course)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        return ResponseEntity.ok(TimesheetMapper.toDto(timesheet));
    }
}
```

---

## Architecture Overview

### Strategy Pattern Implementation

```
┌─────────────────────────────────────────┐
│           ApplicationService            │
│                                         │
│  - Business orchestration              │
│  - Transaction management              │
│  - Depends on abstraction only         │
└─────────────┬───────────────────────────┘
              │ (Dependency Injection)
              ▼
┌─────────────────────────────────────────┐
│      TimesheetPermissionPolicy          │
│           (Interface)                   │
│                                         │
│  + canCreateTimesheet()                 │
│  + canViewTimesheet()                   │
│  + canModifyTimesheet()                 │
│  + ... (14 methods total)               │
└─────────────┬───────────────────────────┘
              │ (Implementation)
              ▼
┌─────────────────────────────────────────┐
│   DefaultTimesheetPermissionPolicy      │
│         (@Component)                    │
│                                         │
│  - Role-based authorization             │
│  - Ownership validation                 │
│  - Course authority checks              │
│  - Status-aware permissions             │
└─────────────────────────────────────────┘
```

### SOLID Principles Implementation

- **SRP**: Policy handles only authorization concerns
- **OCP**: New implementations can be added without changing existing code
- **LSP**: All implementations honor the same contracts
- **ISP**: Interface focused only on timesheet permissions
- **DIP**: Application services depend on abstraction, not concrete implementation

---

## Using the Policy in Your Code

### 1. Dependency Injection

```java
// Constructor injection (preferred)
@Service
public class YourService {
    private final TimesheetPermissionPolicy permissionPolicy;
    
    public YourService(TimesheetPermissionPolicy permissionPolicy) {
        this.permissionPolicy = permissionPolicy;
    }
}

// Field injection (avoid in new code)
@Service
public class LegacyService {
    @Autowired
    private TimesheetPermissionPolicy permissionPolicy;
}
```

### 2. Authorization Check Patterns

#### Early Return Pattern (Recommended)
```java
public List<TimesheetDto> getTimesheets(User requester, Long tutorId, Long courseId) {
    // Early authorization check
    if (!permissionPolicy.canViewTimesheetsByFilters(requester, tutorId, courseId, null)) {
        return Collections.emptyList(); // Or throw exception based on requirements
    }
    
    // Continue with business logic
    return timesheetRepository.findByTutorAndCourse(tutorId, courseId)
        .stream()
        .map(TimesheetMapper::toDto)
        .collect(Collectors.toList());
}
```

#### Exception-Based Pattern
```java
public void deleteTimesheet(Long timesheetId, User requester) {
    Timesheet timesheet = getTimesheetById(timesheetId);
    Course course = getCourseById(timesheet.getCourseId());
    
    // Authorization with exception
    if (!permissionPolicy.canDeleteTimesheet(requester, timesheet, course)) {
        throw new SecurityException(
            String.format("User %s not authorized to delete timesheet %d", 
                         requester.getEmail(), timesheetId)
        );
    }
    
    timesheetRepository.delete(timesheet);
}
```

#### Conditional Logic Pattern
```java
public TimesheetDto updateTimesheet(Long id, UpdateTimesheetRequest request, User requester) {
    Timesheet timesheet = getById(id);
    Course course = getCourseById(timesheet.getCourseId());
    
    // Conditional authorization
    if (permissionPolicy.canEditTimesheet(requester, timesheet, course)) {
        timesheet.updateFromRequest(request);
        return TimesheetMapper.toDto(timesheetRepository.save(timesheet));
    } else {
        throw new ForbiddenOperationException("Cannot edit timesheet in current status");
    }
}
```

### 3. Bulk Operations

```java
public List<TimesheetDto> getAuthorizedTimesheets(User requester, List<Long> timesheetIds) {
    return timesheetIds.stream()
        .map(timesheetRepository::findById)
        .filter(Optional::isPresent)
        .map(Optional::get)
        .filter(timesheet -> {
            Course course = getCourseById(timesheet.getCourseId());
            return permissionPolicy.canViewTimesheet(requester, timesheet, course);
        })
        .map(TimesheetMapper::toDto)
        .collect(Collectors.toList());
}
```

---

## Understanding Authorization Methods

### Creation Permissions

#### `canCreateTimesheet(User creator)`
- **Purpose**: Check basic creation permission based on user role
- **Authorization**: LECTURER and ADMIN can create timesheets
- **Usage**: Pre-check before displaying "Create Timesheet" UI

```java
// Example: UI permission check
if (permissionPolicy.canCreateTimesheet(currentUser)) {
    showCreateTimesheetButton();
}
```

#### `canCreateTimesheetFor(User creator, User tutor, Course course)`
- **Purpose**: Validate specific creation authorization with business context
- **Authorization**: Creator must have authority over the target tutor and course
- **Usage**: Validation during actual timesheet creation

```java
// Example: Creation validation
public Timesheet createTimesheet(User creator, User tutor, Course course, ...) {
    if (!permissionPolicy.canCreateTimesheetFor(creator, tutor, course)) {
        throw new SecurityException("Cannot create timesheet for specified tutor and course");
    }
    // Create timesheet...
}
```

### Read Permissions

#### `canViewTimesheet(User requester, Timesheet timesheet, Course course)`
- **Purpose**: Individual timesheet access control
- **Authorization**: Role-based with ownership and authority checks
- **Usage**: Single timesheet retrieval

```java
// Example: Individual timesheet access
@GetMapping("/{id}")
public TimesheetDto getTimesheet(@PathVariable Long id, Authentication auth) {
    User user = getCurrentUser(auth);
    Timesheet timesheet = timesheetService.getById(id);
    Course course = courseService.getById(timesheet.getCourseId());
    
    if (!permissionPolicy.canViewTimesheet(user, timesheet, course)) {
        throw new ForbiddenException();
    }
    
    return TimesheetMapper.toDto(timesheet);
}
```

#### `canViewTimesheetsByFilters(User requester, Long tutorId, Long courseId, ApprovalStatus status)`
- **Purpose**: Filtered list access control
- **Authorization**: Contextual based on filter parameters
- **Usage**: List endpoints with filtering

```java
// Example: Filtered timesheet queries
public List<TimesheetDto> getTimesheets(User requester, Long tutorId, Long courseId) {
    if (!permissionPolicy.canViewTimesheetsByFilters(requester, tutorId, courseId, null)) {
        return Collections.emptyList(); // No access = empty results
    }
    
    return timesheetRepository.findByFilters(tutorId, courseId)
        .stream()
        .map(TimesheetMapper::toDto)
        .collect(Collectors.toList());
}
```

### Modification Permissions

#### Status-Aware Authorization
The policy provides status-aware authorization for edit and delete operations:

```java
// Edit authorization considers timesheet status
if (permissionPolicy.canEditTimesheet(requester, timesheet, course)) {
    // Editing allowed in current status
}

// Delete authorization also considers status
if (permissionPolicy.canDeleteTimesheet(requester, timesheet, course)) {
    // Deletion allowed in current status
}
```

### Approval Queue Permissions

#### Role-Specific Queue Access

```java
// TUTOR and ADMIN can view pending approval queue
if (permissionPolicy.canViewPendingApprovalQueue(currentUser)) {
    List<TimesheetDto> pending = getTimesheetsInStatus(PENDING_TUTOR_REVIEW);
    return pending;
}

// LECTURER and ADMIN can view lecturer final approval queue
if (permissionPolicy.canViewLecturerFinalApprovalQueue(currentUser)) {
    List<TimesheetDto> lecturerApprovals = getTimesheetsInStatus(APPROVED_BY_TUTOR);
    return lecturerApprovals;
}
```

---

## Testing with the Policy

### Unit Testing with Mocks

```java
@ExtendWith(MockitoExtension.class)
class TimesheetServiceTest {
    
    @Mock
    private TimesheetPermissionPolicy permissionPolicy;
    
    @Mock
    private TimesheetRepository timesheetRepository;
    
    @InjectMocks
    private TimesheetApplicationService timesheetService;
    
    @Test
    void createTimesheet_WhenUnauthorized_ShouldThrowException() {
        // ARRANGE
        User creator = createTestUser(TUTOR);
        User tutor = createTestUser(TUTOR);
        Course course = createTestCourse();
        
        when(permissionPolicy.canCreateTimesheetFor(creator, tutor, course))
            .thenReturn(false);
        
        // ACT & ASSERT
        assertThrows(SecurityException.class, 
            () -> timesheetService.createTimesheet(creator, tutor, course, 
                                                 LocalDate.now(), LocalDate.now()));
        
        // Verify no repository interaction when unauthorized
        verify(timesheetRepository, never()).save(any());
    }
    
    @Test
    void createTimesheet_WhenAuthorized_ShouldCreateSuccessfully() {
        // ARRANGE
        User creator = createTestUser(LECTURER);
        User tutor = createTestUser(TUTOR);
        Course course = createTestCourse();
        
        when(permissionPolicy.canCreateTimesheetFor(creator, tutor, course))
            .thenReturn(true);
        when(timesheetRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        
        // ACT
        Timesheet result = timesheetService.createTimesheet(creator, tutor, course, 
                                                           LocalDate.now(), LocalDate.now());
        
        // ASSERT
        assertNotNull(result);
        verify(permissionPolicy).canCreateTimesheetFor(creator, tutor, course);
        verify(timesheetRepository).save(any());
    }
}
```

### Integration Testing

```java
@SpringBootTest
@TestMethodOrder(OrderAnnotation.class)
class TimesheetPermissionPolicyIntegrationTest {
    
    @Autowired
    private TimesheetPermissionPolicy permissionPolicy;
    
    private User adminUser, lecturerUser, tutorUser;
    private Course testCourse;
    private Timesheet testTimesheet;
    
    @BeforeEach
    void setUp() {
        adminUser = userRepository.save(createUser("admin@test.com", ADMIN));
        lecturerUser = userRepository.save(createUser("lecturer@test.com", LECTURER));
        tutorUser = userRepository.save(createUser("tutor@test.com", TUTOR));
        
        testCourse = courseRepository.save(createCourse("TEST101", lecturerUser.getId()));
        testTimesheet = timesheetRepository.save(createTimesheet(tutorUser, testCourse));
    }
    
    @Test
    void canCreateTimesheetFor_AdminUser_ShouldReturnTrue() {
        boolean result = permissionPolicy.canCreateTimesheetFor(adminUser, tutorUser, testCourse);
        assertTrue(result, "ADMIN should be able to create timesheets for anyone");
    }
    
    @Test
    void canCreateTimesheetFor_LecturerForOwnCourse_ShouldReturnTrue() {
        boolean result = permissionPolicy.canCreateTimesheetFor(lecturerUser, tutorUser, testCourse);
        assertTrue(result, "LECTURER should be able to create timesheets for their own courses");
    }
    
    @Test
    void canViewTimesheet_TutorForOwnTimesheet_ShouldReturnTrue() {
        boolean result = permissionPolicy.canViewTimesheet(tutorUser, testTimesheet, testCourse);
        assertTrue(result, "TUTOR should be able to view their own timesheets");
    }
}
```

### Test Data Builders

```java
public class TestDataBuilder {
    
    public static User createTestUser(UserRole role) {
        return User.builder()
            .email("test_" + role.name().toLowerCase() + "@example.com")
            .role(role)
            .active(true)
            .build();
    }
    
    public static Course createTestCourse(Long lecturerId) {
        return Course.builder()
            .courseCode("TEST101")
            .courseName("Test Course")
            .lecturerId(lecturerId)
            .active(true)
            .build();
    }
    
    public static Timesheet createTestTimesheet(User tutor, Course course, ApprovalStatus status) {
        return Timesheet.builder()
            .tutorId(tutor.getId())
            .courseId(course.getId())
            .status(status)
            .startDate(LocalDate.now())
            .endDate(LocalDate.now().plusDays(6))
            .build();
    }
}
```

---

## Extending the Policy

### Creating Custom Implementations

#### LDAP-Based Authorization
```java
@Component
@ConditionalOnProperty(name = "auth.provider", havingValue = "ldap")
@Primary
public class LdapTimesheetPermissionPolicy implements TimesheetPermissionPolicy {
    
    private final LdapService ldapService;
    private final TimesheetDomainService domainService;
    
    public LdapTimesheetPermissionPolicy(LdapService ldapService, 
                                        TimesheetDomainService domainService) {
        this.ldapService = ldapService;
        this.domainService = domainService;
    }
    
    @Override
    public boolean canCreateTimesheetFor(User creator, User tutor, Course course) {
        // LDAP-based permission check
        return ldapService.hasPermission(creator.getEmail(), "timesheet:create") &&
               ldapService.hasAuthorityOver(creator.getEmail(), course.getCourseCode());
    }
    
    @Override
    public boolean canViewTimesheet(User requester, Timesheet timesheet, Course course) {
        // Combine LDAP permissions with domain logic
        boolean hasLdapPermission = ldapService.hasPermission(requester.getEmail(), "timesheet:read");
        boolean hasDomainAccess = domainService.isTutorOwnerOfTimesheet(requester, timesheet) ||
                                 domainService.hasLecturerAuthorityOverCourse(requester, course);
        
        return hasLdapPermission && hasDomainAccess;
    }
    
    // ... implement other methods
}
```

#### Audit-Enabled Policy (Decorator Pattern)
```java
@Component
@ConditionalOnProperty(name = "auth.audit.enabled", havingValue = "true")
@Primary
public class AuditableTimesheetPermissionPolicy implements TimesheetPermissionPolicy {
    
    private final TimesheetPermissionPolicy delegate;
    private final AuditService auditService;
    
    public AuditableTimesheetPermissionPolicy(
            @Qualifier("defaultTimesheetPermissionPolicy") TimesheetPermissionPolicy delegate,
            AuditService auditService) {
        this.delegate = delegate;
        this.auditService = auditService;
    }
    
    @Override
    public boolean canCreateTimesheetFor(User creator, User tutor, Course course) {
        boolean result = delegate.canCreateTimesheetFor(creator, tutor, course);
        
        // Audit the authorization decision
        auditService.logAuthorizationEvent(
            AuditEvent.builder()
                .action("CREATE_TIMESHEET")
                .requester(creator.getEmail())
                .resource("timesheet")
                .resourceId(tutor.getId() + ":" + course.getId())
                .decision(result ? "ALLOWED" : "DENIED")
                .timestamp(LocalDateTime.now())
                .build()
        );
        
        return result;
    }
    
    // ... implement other methods with audit logging
}
```

#### Multi-Tenant Policy
```java
@Component
@ConditionalOnProperty(name = "app.multi-tenant", havingValue = "true")
@Primary
public class MultiTenantTimesheetPermissionPolicy implements TimesheetPermissionPolicy {
    
    private final TimesheetPermissionPolicy defaultPolicy;
    private final TenantService tenantService;
    
    @Override
    public boolean canViewTimesheet(User requester, Timesheet timesheet, Course course) {
        // Tenant isolation check
        if (!tenantService.canUserAccessTenant(requester, course.getTenantId())) {
            return false;
        }
        
        // Delegate to default policy for same-tenant access
        return defaultPolicy.canViewTimesheet(requester, timesheet, course);
    }
    
    // ... other methods with tenant checks
}
```

### Configuration-Based Selection

```yaml
# application.yml
auth:
  provider: ldap  # default, ldap, oauth
  audit:
    enabled: true
  multi-tenant: false

# Spring configuration
@Configuration
public class AuthorizationConfig {
    
    @Bean
    @ConditionalOnProperty(name = "auth.provider", havingValue = "default", matchIfMissing = true)
    @Primary
    public TimesheetPermissionPolicy defaultTimesheetPermissionPolicy(
            TimesheetDomainService domainService, 
            CourseRepository courseRepository) {
        return new DefaultTimesheetPermissionPolicy(domainService, courseRepository);
    }
    
    @Bean
    @ConditionalOnProperty(name = "auth.provider", havingValue = "ldap")
    @Primary  
    public TimesheetPermissionPolicy ldapTimesheetPermissionPolicy(
            LdapService ldapService,
            TimesheetDomainService domainService) {
        return new LdapTimesheetPermissionPolicy(ldapService, domainService);
    }
}
```

---

## Common Patterns

### 1. Controller Authorization Pattern

```java
@RestController
@RequestMapping("/api/timesheets")
public class TimesheetController {
    
    private final TimesheetService timesheetService;
    private final TimesheetPermissionPolicy permissionPolicy;
    
    // Standard authorization pattern for REST endpoints
    @GetMapping("/{id}")
    public ResponseEntity<?> getTimesheet(@PathVariable Long id, Authentication auth) {
        try {
            User user = getCurrentUser(auth);
            TimesheetDto result = timesheetService.getAuthorizedTimesheet(id, user);
            return ResponseEntity.ok(result);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.builder()
                    .error("AUTHORIZATION_FAILED")
                    .message(e.getMessage())
                    .timestamp(LocalDateTime.now())
                    .path("/api/timesheets/" + id)
                    .build());
        }
    }
    
    // Bulk operations with filtering
    @GetMapping
    public List<TimesheetDto> getTimesheets(
            @RequestParam(required = false) Long tutorId,
            @RequestParam(required = false) Long courseId,
            Authentication auth) {
        
        User user = getCurrentUser(auth);
        return timesheetService.getAuthorizedTimesheets(user, tutorId, courseId);
    }
}
```

### 2. Service Layer Authorization Pattern

```java
@Service
@Transactional
public class TimesheetApplicationService {
    
    // Helper method for consistent authorization
    private void validateTimesheetAccess(User user, Timesheet timesheet, String operation) {
        Course course = courseService.getById(timesheet.getCourseId());
        
        boolean authorized = switch (operation) {
            case "view" -> permissionPolicy.canViewTimesheet(user, timesheet, course);
            case "edit" -> permissionPolicy.canEditTimesheet(user, timesheet, course);
            case "delete" -> permissionPolicy.canDeleteTimesheet(user, timesheet, course);
            default -> false;
        };
        
        if (!authorized) {
            throw new SecurityException(
                String.format("User %s not authorized to %s timesheet %d", 
                             user.getEmail(), operation, timesheet.getId())
            );
        }
    }
    
    // Use helper in service methods
    public TimesheetDto getTimesheet(Long id, User requester) {
        Timesheet timesheet = timesheetRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Timesheet not found"));
        
        validateTimesheetAccess(requester, timesheet, "view");
        
        return TimesheetMapper.toDto(timesheet);
    }
}
```

### 3. Batch Authorization Pattern

```java
public class BatchTimesheetService {
    
    public List<TimesheetDto> getAuthorizedTimesheets(User requester, List<Long> timesheetIds) {
        // Fetch all timesheets
        Map<Long, Timesheet> timesheets = timesheetRepository.findAllById(timesheetIds)
            .stream()
            .collect(Collectors.toMap(Timesheet::getId, Function.identity()));
        
        // Fetch all courses in single query
        Set<Long> courseIds = timesheets.values().stream()
            .map(Timesheet::getCourseId)
            .collect(Collectors.toSet());
        Map<Long, Course> courses = courseRepository.findAllById(courseIds)
            .stream()
            .collect(Collectors.toMap(Course::getId, Function.identity()));
        
        // Filter by authorization
        return timesheetIds.stream()
            .map(timesheets::get)
            .filter(Objects::nonNull)
            .filter(timesheet -> {
                Course course = courses.get(timesheet.getCourseId());
                return course != null && 
                       permissionPolicy.canViewTimesheet(requester, timesheet, course);
            })
            .map(TimesheetMapper::toDto)
            .collect(Collectors.toList());
    }
}
```

---

## Troubleshooting

### Common Issues

#### 1. **Authorization Always Returns False**

**Symptoms**: All authorization checks fail regardless of user role

**Possible Causes**:
- Policy implementation not properly registered as Spring component
- Missing required dependencies (TimesheetDomainService, CourseRepository)
- User role not properly set

**Debugging**:
```java
@Component
public class AuthorizationDebugService {
    
    private final TimesheetPermissionPolicy permissionPolicy;
    
    @EventListener
    public void onAuthorizationEvent(AuthorizationEvent event) {
        log.debug("Authorization check: user={}, operation={}, result={}", 
                  event.getUser().getEmail(), 
                  event.getOperation(), 
                  event.getResult());
    }
}
```

#### 2. **Policy Not Being Used**

**Symptoms**: Authorization logic not executing, old authorization code still running

**Solution**: Check Spring component configuration and ensure proper dependency injection

```java
// Verify policy is being injected
@PostConstruct
public void verifyConfiguration() {
    log.info("TimesheetPermissionPolicy implementation: {}", 
             permissionPolicy.getClass().getSimpleName());
}
```

#### 3. **Performance Issues with Authorization Checks**

**Symptoms**: Slow response times, multiple database queries per authorization check

**Solutions**:
- Implement caching for course lookups
- Use batch queries for multiple authorization checks
- Consider authorization at query level for list operations

```java
// Example: Cached course authority check
@Cacheable(value = "course-authority", key = "#user.id + ':' + #courseId")
public boolean hasLecturerAuthorityOverCourse(User user, Long courseId) {
    Course course = courseRepository.findById(courseId).orElse(null);
    return course != null && course.getLecturerId().equals(user.getId());
}
```

### Debugging Authorization Flows

#### Enable Debug Logging
```yaml
# application.yml
logging:
  level:
    com.usyd.catams.policy: DEBUG
    com.usyd.catams.domain.service: DEBUG
```

#### Authorization Flow Tracer
```java
@Component
@Profile("development")
public class AuthorizationTracer {
    
    @EventListener
    public void onMethodCall(MethodCallEvent event) {
        if (event.getClassName().contains("PermissionPolicy")) {
            log.debug("Policy method: {}.{}() with args: {}", 
                      event.getClassName(), 
                      event.getMethodName(), 
                      Arrays.toString(event.getArgs()));
        }
    }
}
```

---

## Best Practices

### 1. Authorization Placement
- **Always** check authorization before business logic execution
- **Never** mix authorization logic with business logic
- **Use** early returns or exceptions for unauthorized access
- **Prefer** specific error messages for debugging

### 2. Error Handling
```java
// Good: Specific error messages
if (!permissionPolicy.canEditTimesheet(user, timesheet, course)) {
    throw new SecurityException(
        String.format("User %s (role: %s) cannot edit timesheet %d in status %s", 
                      user.getEmail(), user.getRole(), timesheet.getId(), timesheet.getStatus())
    );
}

// Bad: Generic error messages
if (!permissionPolicy.canEditTimesheet(user, timesheet, course)) {
    throw new SecurityException("Access denied");
}
```

### 3. Testing Strategy
- **Always** test both authorized and unauthorized scenarios
- **Mock** the policy interface in unit tests
- **Use** real implementations in integration tests
- **Test** edge cases (null values, invalid states)

### 4. Performance Considerations
- **Cache** frequently accessed authorization data
- **Batch** authorization checks when possible
- **Consider** query-level authorization for large datasets
- **Monitor** authorization performance in production

### 5. Security Considerations
- **Never** skip authorization checks for "admin" or "system" users
- **Log** authorization failures for security monitoring
- **Validate** all input parameters before authorization checks
- **Use** secure defaults (deny by default)

### 6. Code Organization
- **Keep** authorization logic in the policy implementation
- **Use** helper methods for complex authorization scenarios
- **Document** custom authorization rules
- **Follow** consistent naming patterns

---

## Conclusion

The TimesheetPermissionPolicy provides a flexible, testable, and maintainable authorization framework following SOLID principles and the Strategy pattern. By following the patterns and practices outlined in this guide, developers can:

- Implement consistent authorization across all timesheet operations
- Easily extend authorization logic without modifying existing code
- Write comprehensive tests for both business logic and authorization
- Debug authorization issues effectively
- Maintain security best practices

For additional support or questions about the policy pattern implementation, refer to the architectural documentation or contact the development team.

---

**Document Version**: 1.0  
**Creation Date**: 2025-08-12  
**Last Updated**: 2025-08-12  
**Maintainer**: Development Team  
**Related Documentation**: 
- [SOLID Compliance Validation](solid-compliance-validation.md)
- [Service Interfaces Catalog](service-interfaces.md)
- [API Documentation Update](approval-workflow-api-update.md)
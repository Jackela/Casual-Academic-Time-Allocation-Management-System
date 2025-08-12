# Service Interfaces Catalog - CATAMS v2.0

## Purpose
This document provides a comprehensive catalog of all service interfaces in the CATAMS microservices-ready architecture. Each interface represents a future microservice boundary and will become a REST API when extracted.

## 1. Service Interface Overview

| Service | Status | Methods | Future Endpoint | Key Responsibilities |
|---------|--------|---------|-----------------|---------------------|
| UserManagementService | ✅ Complete | 12 | `/api/users/*` | Authentication, Authorization, User CRUD |
| CourseManagementService | 🔄 In Progress | 16 | `/api/courses/*` | Course CRUD, Budget, Capacity Management |
| DecisionService | ✅ Complete | 22 | `/api/decisions/*` | Business Rules, Validation, Workflow Logic |
| TimesheetService | 📋 Planned | ~15 | `/api/timesheets/*` | Timesheet CRUD, Approval Flow |

## 2. UserManagementService Interface

### 2.1 Interface Definition
**Package**: `com.usyd.catams.application.user`
**Implementation**: `UserApplicationService.java`
**Future Migration**: User Microservice

### 2.2 Method Catalog

#### Authentication & Authorization
```java
Optional<UserDto> getUserById(Long userId);
// Future: GET /api/users/{userId}
// Returns: User details or 404 if not found

Optional<UserDto> getUserByEmail(String email);
// Future: GET /api/users?email={email}  
// Returns: User by email address or empty

boolean hasPermission(Long userId, String permission);
// Future: GET /api/users/{userId}/permissions/{permission}
// Returns: true if user has specified permission
```

#### User Operations
```java
List<UserDto> getUsersByRole(UserRole role);
// Future: GET /api/users?role={role}
// Returns: All users with specified role

List<UserDto> searchUsers(UserSearchCriteria criteria);
// Future: POST /api/users/search
// Returns: Users matching search criteria

UserDto createUser(CreateUserRequest request);
// Future: POST /api/users
// Returns: Created user or validation errors

void updateUser(Long userId, UpdateUserRequest request);
// Future: PUT /api/users/{userId}
// Returns: 204 No Content or validation errors

void deactivateUser(Long userId, String reason);
// Future: DELETE /api/users/{userId}
// Returns: 204 No Content
```

#### Role Management
```java
void assignUserToRole(Long userId, UserRole role);
// Future: PUT /api/users/{userId}/role
// Returns: 204 No Content

List<UserDto> getActiveUsers();
// Future: GET /api/users?status=active
// Returns: All active users

boolean isUserActive(Long userId);
// Future: GET /api/users/{userId}/status
// Returns: User active status
```

### 2.3 DTO Structures

#### UserDto
```java
public class UserDto {
    private final Long id;
    private final String email;
    private final UserRole role;
    private final String displayName;
    private final boolean active;
    private final List<String> permissions;
    private final LocalDateTime lastLoginAt;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    
    // Business Logic Methods
    public boolean hasPermission(String permission);
    public boolean canApproveTimesheets();
    public boolean isInRole(UserRole role);
    public String getRoleDisplayName();
    public boolean isAccountNonExpired();
}
```

#### CreateUserRequest
```java
public class CreateUserRequest {
    private final String email;
    private final String password;
    private final UserRole role;
    private final String firstName;
    private final String lastName;
    private final boolean sendWelcomeEmail;
}
```

## 3. CourseManagementService Interface

### 3.1 Interface Definition
**Package**: `com.usyd.catams.application.course`
**Implementation**: `CourseApplicationService.java` (In Progress)
**Future Migration**: Course Microservice

### 3.2 Method Catalog

#### Course Operations
```java
Optional<CourseDto> getCourseById(Long courseId);
// Future: GET /api/courses/{courseId}
// Returns: Course details or 404

Optional<CourseDto> getCourseByCode(String courseCode);
// Future: GET /api/courses?code={courseCode}
// Returns: Course by code or empty

List<CourseDto> getCoursesByLecturer(Long lecturerId);
// Future: GET /api/lecturers/{lecturerId}/courses
// Returns: All courses taught by lecturer

List<CourseDto> getCoursesByTutor(Long tutorId);
// Future: GET /api/tutors/{tutorId}/courses
// Returns: All courses where tutor is assigned

List<CourseDto> getActiveCourses();
// Future: GET /api/courses?active=true
// Returns: All active courses

List<CourseDto> getCoursesBySemesterAndYear(String semester, Integer year);
// Future: GET /api/courses?semester={semester}&year={year}
// Returns: Courses for specific semester/year
```

#### Access Control & Relationships
```java
boolean isLecturerOfCourse(Long userId, Long courseId);
// Future: GET /api/courses/{courseId}/lecturers/{userId}
// Returns: true if user is lecturer for course

boolean isTutorOfCourse(Long userId, Long courseId);
// Future: GET /api/courses/{courseId}/tutors/{userId}
// Returns: true if user is tutor for course

boolean hasUserCourseRelationship(Long userId, Long courseId);
// Future: GET /api/courses/{courseId}/users/{userId}/relationship
// Returns: true if user has any relationship with course

boolean canUserPerformCourseOperation(Long courseId, Long userId, String operation);
// Future: POST /api/courses/{courseId}/permissions/validate
// Returns: true if user can perform operation
```

#### Business Logic & Capacity Management
```java
Optional<CourseDto> getCourseForTimesheetOperations(Long courseId);
// Future: GET /api/courses/{courseId}/timesheet-info
// Returns: Course info needed for timesheet operations

boolean isCourseActiveAndValid(Long courseId);
// Future: GET /api/courses/{courseId}/status
// Returns: true if course is active and valid

Optional<CourseDto> getCourseBudgetInfo(Long courseId);
// Future: GET /api/courses/{courseId}/budget
// Returns: Course budget information

Optional<CourseDto> getCourseCapacityInfo(Long courseId);
// Future: GET /api/courses/{courseId}/capacity
// Returns: Course capacity and enrollment info

boolean canAssignMoreTutors(Long courseId);
// Future: GET /api/courses/{courseId}/tutor-limit-status
// Returns: true if course has space for more tutors

List<CourseDto> getCoursesNeedingTutors();
// Future: GET /api/courses/needs-tutors
// Returns: Courses that need tutor assignments
```

### 3.3 DTO Structures

#### CourseDto
```java
public class CourseDto {
    private final Long id;
    private final String courseCode;
    private final String courseName;
    private final String description;
    private final String semester;
    private final Integer year;
    private final Long lecturerId;
    private final String lecturerName;
    private final String lecturerEmail;
    private final boolean active;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final Integer maxStudents;
    private final Integer currentEnrollment;
    private final Integer maxTutors;
    private final Integer currentTutors;
    private final BigDecimal budgetLimit;
    private final BigDecimal budgetUsed;
    private final BigDecimal defaultHourlyRate;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    
    // Business Logic Methods
    public String getFullCourseName();
    public boolean isCurrentlyActive();
    public boolean hasTutorSlots();
    public boolean isAtStudentCapacity();
    public BigDecimal getRemainingBudget();
    public boolean hasSufficientBudget(BigDecimal amount);
    public BigDecimal getBudgetUtilizationPercentage();
    public String getSemesterYear();
    public boolean isCurrentSemester();
}
```

## 4. DecisionService Interface (Business Rules Engine)

### 4.1 Interface Definition
**Package**: `com.usyd.catams.application.decision`
**Implementation**: `DecisionApplicationService.java` ✅ Complete
**Future Migration**: Decision Microservice (Most Critical Service)

### 4.2 Method Catalog

#### Core Decision Evaluation
```java
DecisionResult evaluate(DecisionRequest request);
// Future: POST /api/decisions/evaluate
// Returns: Comprehensive decision with violations and recommendations

CompletableFuture<DecisionResult> evaluateAsync(DecisionRequest request);
// Future: POST /api/decisions/evaluate-async
// Returns: Asynchronous decision evaluation
```

#### Validation Operations
```java
ValidationResult validateTimesheet(DecisionRequest request);
// Future: POST /api/decisions/validate-timesheet
// Returns: Timesheet validation result with violations

ValidationResult validateWorkflowTransition(WorkflowEvaluationRequest request);
// Future: POST /api/decisions/validate-workflow
// Returns: Workflow transition validation result

ValidationResult validateFinancialConstraints(DecisionRequest request);
// Future: POST /api/decisions/validate-financial
// Returns: Financial constraint validation

ValidationResult validateCourseCapacity(DecisionRequest request);
// Future: POST /api/decisions/validate-course-capacity
// Returns: Course capacity validation

ValidationResult validateDataQuality(DecisionRequest request);
// Future: POST /api/decisions/validate-data-quality
// Returns: Data quality validation result
```

#### Permission & Authorization
```java
boolean checkPermission(PermissionCheckRequest request);
// Future: POST /api/decisions/check-permission
// Returns: true if user has permission

ValidationResult checkUserEligibility(PermissionCheckRequest request);
// Future: POST /api/decisions/check-eligibility
// Returns: User eligibility validation result
```

#### Workflow Management
```java
List<ApprovalAction> getValidActions(WorkflowEvaluationRequest request);
// Future: POST /api/decisions/valid-actions
// Returns: List of valid actions for current state

ApprovalStatus getNextStatus(ApprovalAction action, ApprovalStatus currentStatus, 
                            UserRole userRole, DecisionRequest context);
// Future: POST /api/decisions/next-status
// Returns: Next status for successful action
```

#### Rule Management & Metadata
```java
String getRuleExplanation(String ruleId);
// Future: GET /api/decisions/rule-explanations/{ruleId}
// Returns: Human-readable rule explanation

List<String> getApplicableRules(DecisionRequest request);
// Future: POST /api/decisions/applicable-rules
// Returns: List of rules applying to context

ValidationResult validateRuleConsistency(String ruleSetId);
// Future: POST /api/decisions/validate-rule-consistency
// Returns: Rule consistency validation

DecisionResult getRuleSetInfo();
// Future: GET /api/decisions/rule-version
// Returns: Current rule set version information
```

#### Advanced Features
```java
List<ValidationResult> batchValidate(List<DecisionRequest> requests);
// Future: POST /api/decisions/batch-validate
// Returns: Batch validation results

DecisionResult testRule(String ruleId, DecisionRequest request);
// Future: POST /api/decisions/test-rule
// Returns: Rule testing result

DecisionResult getRecommendations(DecisionRequest request);
// Future: POST /api/decisions/recommendations
// Returns: AI-like suggestions and recommendations

DecisionResult getRulePerformanceMetrics();
// Future: GET /api/decisions/metrics
// Returns: Rule execution performance metrics

DecisionResult getDecisionAuditTrail(String decisionId);
// Future: GET /api/decisions/audit-trail/{decisionId}
// Returns: Decision audit trail

ValidationResult refreshRules();
// Future: POST /api/decisions/refresh-rules
// Returns: Rule refresh status
```

### 4.3 DTO Structures

#### DecisionRequest (Flexible Facts-Based Request)
```java
public class DecisionRequest {
    private final String ruleSetId;
    private final String requestId;
    private final Map<String, Object> facts;
    private final String userId;
    private final Integer priority;
    private final LocalDateTime timestamp;
    
    // Type-safe fact retrieval methods
    public <T> T getFact(String key, Class<T> type);
    public <T> T getFact(String key, T defaultValue);
    public boolean hasFact(String key);
    public Set<String> getFactKeys();
}
```

#### DecisionResult (Rich Result Structure)
```java
public class DecisionResult {
    public enum Decision { APPROVED, REJECTED, CONDITIONAL, PENDING_REVIEW, INSUFFICIENT_DATA, ERROR }
    public enum Severity { CRITICAL, HIGH, MEDIUM, LOW, INFO }
    
    private final String requestId;
    private final Decision decision;
    private final boolean valid;
    private final List<RuleViolation> violations;
    private final List<Recommendation> recommendations;
    private final Map<String, Object> resultData;
    private final ExecutionMetadata metadata;
    private final LocalDateTime timestamp;
    
    // Business logic methods
    public boolean hasViolations();
    public boolean hasCriticalViolations();
    public List<RuleViolation> getViolationsBySeverity(Severity severity);
    public boolean hasRecommendations();
    public String getSummary();
}
```

## 5. TimesheetPermissionPolicy Interface (SOLID Compliance)

### 5.1 Interface Definition
**Package**: `com.usyd.catams.policy`
**Implementation**: `DefaultTimesheetPermissionPolicy.java` ✅ Complete
**Pattern**: Strategy Pattern + Dependency Inversion Principle
**Purpose**: Authorization logic decoupled from application service

### 5.2 Method Catalog

#### Creation Permissions
```java
boolean canCreateTimesheet(User creator);
// Purpose: Check if user has timesheet creation privileges
// Returns: true if user role allows timesheet creation

boolean canCreateTimesheetFor(User creator, User tutor, Course course);
// Purpose: Validate specific creation authorization
// Returns: true if creator can create timesheet for tutor in course
```

#### Read Permissions
```java
boolean canViewTimesheet(User requester, Timesheet timesheet, Course course);
// Purpose: Individual timesheet view authorization
// Returns: true if user can view specific timesheet

boolean canViewTimesheetsByFilters(User requester, Long tutorId, Long courseId, ApprovalStatus status);
// Purpose: Filtered timesheet list authorization
// Returns: true if user can view timesheets with specified filters

boolean canViewTimesheetsByDateRange(User requester, Long tutorId, LocalDate startDate, LocalDate endDate);
// Purpose: Date range query authorization
// Returns: true if user can view timesheets in date range

boolean canViewTotalHours(User requester, Long tutorId, Long courseId);
// Purpose: Aggregate hours view authorization
// Returns: true if user can view total hours data

boolean canViewCourseBudget(User requester, Long courseId);
// Purpose: Financial data access authorization
// Returns: true if user can view course budget information
```

#### Modification Permissions
```java
boolean canModifyTimesheet(User requester, Timesheet timesheet, Course course);
// Purpose: General modification permission check
// Returns: true if user can edit or delete timesheet

boolean canEditTimesheet(User requester, Timesheet timesheet, Course course);
// Purpose: Status-aware edit authorization
// Returns: true if user can edit timesheet in current status

boolean canDeleteTimesheet(User requester, Timesheet timesheet, Course course);
// Purpose: Status-aware deletion authorization
// Returns: true if user can delete timesheet in current status
```

#### Approval Queue Permissions
```java
boolean canViewPendingApprovalQueue(User requester);
// Purpose: Pending approval list access
// Returns: true if user can access pending approval queue

boolean canViewLecturerFinalApprovalQueue(User requester);
// Purpose: Final approval queue access
// Returns: true if user can access lecturer final approval queue

boolean canViewTimesheetsByTutor(User requester, Long tutorId);
// Purpose: Tutor-specific timesheet access
// Returns: true if user can view specified tutor's timesheets
```

### 5.3 Policy Implementation Details

#### Authorization Patterns
```java
@Component
public class DefaultTimesheetPermissionPolicy implements TimesheetPermissionPolicy {
    
    // Role-based hierarchy: ADMIN > LECTURER > TUTOR
    // Ownership-based: Users can access own resources
    // Resource-based: Authority over specific courses
    // Status-based: Permissions vary by timesheet status
    
    private final TimesheetDomainService domainService;
    private final CourseRepository courseRepository;
    
    // Leverages existing domain services for business rules
    // Maintains clean separation from application orchestration
}
```

#### Integration with ApplicationService
```java
@Service
@Transactional
public class TimesheetApplicationService implements TimesheetService {
    
    private final TimesheetPermissionPolicy permissionPolicy;  // DIP compliance
    
    // Authorization delegated to policy instead of embedded logic
    public Timesheet createTimesheet(...) {
        if (!permissionPolicy.canCreateTimesheetFor(creator, tutor, course)) {
            throw new SecurityException("User not authorized...");
        }
        // Business logic continues...
    }
}
```

### 5.4 Design Pattern Implementation

#### Strategy Pattern
- **Interface**: `TimesheetPermissionPolicy` defines authorization contracts
- **Implementation**: `DefaultTimesheetPermissionPolicy` provides role-based authorization
- **Extensibility**: New authorization strategies (LDAP, OAuth, etc.) can be added without modifying ApplicationService

#### Dependency Inversion Principle
- **High-level module**: `TimesheetApplicationService` depends on policy abstraction
- **Low-level module**: Policy implementation handles concrete authorization logic  
- **Abstraction**: `TimesheetPermissionPolicy` interface defines contracts
- **Benefit**: Authorization logic can be changed without modifying business orchestration

#### Single Responsibility Principle
- **ApplicationService**: Pure business orchestration and transaction management
- **PermissionPolicy**: Pure authorization logic and access control
- **Domain Service**: Core business rules and validation
- **Clear boundaries**: Each component has single, well-defined responsibility

## 6. Future TimesheetService Interface

### 6.1 Interface Definition (Planned)
**Package**: `com.usyd.catams.application.timesheet`
**Implementation**: `TimesheetApplicationService.java` (Existing)
**Future Migration**: Timesheet Microservice

### 5.2 Planned Method Catalog

#### Timesheet CRUD Operations
```java
Optional<TimesheetDto> getTimesheetById(Long timesheetId);
// Future: GET /api/timesheets/{timesheetId}

List<TimesheetDto> getTimesheetsByUser(Long userId, LocalDate startDate, LocalDate endDate);
// Future: GET /api/users/{userId}/timesheets?start={start}&end={end}

TimesheetDto createTimesheet(CreateTimesheetRequest request);
// Future: POST /api/timesheets

void updateTimesheet(Long timesheetId, UpdateTimesheetRequest request);
// Future: PUT /api/timesheets/{timesheetId}

void deleteTimesheet(Long timesheetId);
// Future: DELETE /api/timesheets/{timesheetId}
```

#### Approval Workflow Operations  
```java
void submitForApproval(Long timesheetId);
// Future: POST /api/timesheets/{timesheetId}/submit

void approveTimesheet(Long timesheetId, ApprovalRequest request);
// Future: POST /api/timesheets/{timesheetId}/approve

void rejectTimesheet(Long timesheetId, RejectionRequest request);
// Future: POST /api/timesheets/{timesheetId}/reject

List<TimesheetDto> getPendingApprovals(Long approverId);
// Future: GET /api/approvers/{approverId}/pending-timesheets

List<ApprovalHistoryDto> getApprovalHistory(Long timesheetId);
// Future: GET /api/timesheets/{timesheetId}/approval-history
```

## 6. Cross-Service Integration Patterns

### 6.1 Service Communication (Current: In-Process)
```java
// UserManagementService -> DecisionService
PermissionCheckRequest request = PermissionCheckRequest.builder()
    .userId(userId.toString())
    .userRole(userRole)
    .action("CREATE_TIMESHEET")
    .resourceType("COURSE")
    .resourceId(courseId.toString())
    .build();
boolean canCreate = decisionService.checkPermission(request);
```

### 6.2 Service Communication (Future: HTTP/Message Queue)
```java
// Future HTTP-based service communication
@Component
public class UserManagementServiceClient {
    
    @Autowired
    private RestTemplate restTemplate;
    
    public Optional<UserDto> getUserById(Long userId) {
        return restTemplate.getForObject(
            "/api/users/{userId}", 
            Optional.class, 
            userId
        );
    }
}
```

## 7. API Evolution and Versioning Strategy

### 7.1 Interface Versioning
- **Current**: Java interfaces with semantic versioning
- **Future**: REST API versioning with backward compatibility
- **Migration**: Gradual rollout with dual interfaces during transition

### 7.2 DTO Evolution
- **Immutable Design**: DTOs designed for evolution without breaking changes
- **Optional Fields**: New fields added as optional with sensible defaults
- **Deprecation Strategy**: Gradual deprecation of old fields

### 7.3 Service Contract Testing
```java
// Contract tests ensure interface compatibility
@Test
public void userServiceContractTest() {
    // Test that UserManagementService implements expected interface
    // Verify DTO serialization/deserialization
    // Validate API contract compliance
}
```

## 8. Service Interface Testing Strategy

### 8.1 Interface Contract Testing
Each service interface has comprehensive contract tests:
- **Method Signatures**: Validate interface compliance
- **DTO Structure**: Verify data transfer object contracts
- **Business Logic**: Test computed properties and validation methods
- **Error Handling**: Validate exception behavior

### 8.2 TDD Test Coverage by Service

| Service | Test Files | Test Methods | Coverage Focus |
|---------|------------|--------------|----------------|
| UserManagementService | UserManagementServiceTest.java | 35+ | Authentication, Authorization, CRUD |
| CourseManagementService | CourseManagementServiceTest.java | 45+ | Course Logic, Budget, Capacity |
| DecisionService | DecisionServiceTest.java | 150+ | Business Rules, Validation, Workflow |
| TimesheetService | (Future) | ~40+ | CRUD, Approval Flow, History |

### 8.3 Cross-Service Integration Tests
```java
@SpringBootTest
@TestMethodOrder(OrderAnnotation.class)
class TimesheetApprovalWorkflowIntegrationTest {
    
    @Test
    @Order(1)
    void createUserAndCourse() {
        // Test UserManagementService + CourseManagementService
    }
    
    @Test 
    @Order(2)
    void validateTimesheetCreation() {
        // Test DecisionService validation
    }
    
    @Test
    @Order(3)
    void completeApprovalWorkflow() {
        // Test full workflow across all services
    }
}
```

---

## Appendix: Service Interface Evolution Timeline

### Phase 1: Service Boundaries (Current - 80% Complete)
✅ **UserManagementService**: Complete interface + implementation
✅ **DecisionService**: Complete interface + implementation (22 methods)
🔄 **CourseManagementService**: Interface complete, implementation 80%
📋 **TimesheetService**: Interface design pending

### Phase 2: Event-Driven Communication (Planned Q2 2025)
- Domain events for service communication
- Event publishers and handlers
- Message queue integration preparation

### Phase 3: REST API Extraction (Planned Q3-Q4 2025)
- Convert interfaces to REST controllers
- Service-to-service HTTP communication
- API gateway and service discovery
- Independent service deployment

---

**Document Version**: v2.0  
**Creation Date**: 2025-08-06  
**Update Date**: 2025-08-06  
**Status**: Phase 1 Service Boundaries - 80% Complete  
**Next Milestone**: Complete CourseApplicationService + Create TimesheetServicePort  
**Maintainer**: Development Team
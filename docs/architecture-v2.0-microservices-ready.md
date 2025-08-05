# Architecture Design Document - v2.0 (Microservices-Ready)

## 1. Executive Summary

### 1.1 Architecture Evolution
The CATAMS (Casual Academic Time Allocation Management System) has evolved from a modular monolith (v0.2) to a **Microservices-Ready Monolith** architecture (v2.0). This strategic approach maintains the development efficiency and deployment simplicity of a monolith while preparing for future microservices extraction through well-defined service boundaries and interfaces.

### 1.2 Key Improvements
- **Service Boundary Definition**: Clear interfaces separating concerns (User, Course, Decision, Timesheet services)
- **Centralized Business Logic**: Single Source of Truth through DecisionService for all business rules
- **Port-Adapter Pattern**: Future-ready interfaces that will become REST APIs
- **Comprehensive DTO Layer**: Immutable data transfer objects ready for JSON serialization
- **Event-Driven Preparation**: Foundation for future inter-service communication

## 2. Architectural Principles

### 2.1 Microservices-Ready Design
The architecture follows the **Strangler Fig Pattern** for gradual migration:
- **Phase 1**: Service boundary preparation with clear interfaces
- **Phase 2**: Event-driven communication infrastructure
- **Phase 3**: Database schema organization and eventual extraction

### 2.2 Single Source of Truth (SSOT)
- **Business Rules**: Centralized in `DecisionService` with `WorkflowRulesRegistry`
- **Service Interfaces**: Each domain has a single authoritative API
- **Data Consistency**: Maintained through well-defined boundaries

### 2.3 Domain-Driven Design (DDD)
- **Bounded Contexts**: User Management, Course Management, Decision Engine, Timesheet Operations
- **Rich Domain Models**: Value objects (CourseCode, Money) with business logic
- **Anti-Corruption Layer**: DTOs prevent domain model leakage

## 3. Service Architecture

### 3.1 Service Boundary Overview
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  UserManagement     │    │  CourseManagement   │    │  DecisionService    │
│  Service            │    │  Service            │    │  (Business Rules)   │
│                     │    │                     │    │                     │
│  - Authentication   │    │  - Course CRUD      │    │  - Rule Evaluation  │
│  - Authorization    │    │  - Lecturer Mgmt    │    │  - Workflow Logic   │
│  - User Operations  │    │  - Budget Tracking  │    │  - Validation       │
│  - Role Management  │    │  - Capacity Mgmt    │    │  - Permissions      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
                    ┌─────────────────────┐
                    │  TimesheetService   │
                    │  (Future)           │
                    │                     │
                    │  - Timesheet CRUD   │
                    │  - Approval Flow    │
                    │  - History Mgmt     │
                    └─────────────────────┘
```

### 3.2 UserManagementService Interface
**Current Location**: `com.usyd.catams.application.user`
**Future Migration**: Will become User Microservice

```java
public interface UserManagementService {
    // Authentication & Authorization
    Optional<UserDto> getUserById(Long userId);
    Optional<UserDto> getUserByEmail(String email);
    boolean hasPermission(Long userId, String permission);
    
    // User Operations
    List<UserDto> getUsersByRole(UserRole role);
    List<UserDto> searchUsers(UserSearchCriteria criteria);
    UserDto createUser(CreateUserRequest request);
    void updateUser(Long userId, UpdateUserRequest request);
    void deactivateUser(Long userId, String reason);
    
    // Role Management
    void assignUserToRole(Long userId, UserRole role);
    List<UserDto> getActiveUsers();
    boolean isUserActive(Long userId);
    
    // Future REST Endpoints:
    // GET /api/users/{userId}
    // GET /api/users?role={role}
    // POST /api/users
    // PUT /api/users/{userId}
    // DELETE /api/users/{userId}
}
```

### 3.3 CourseManagementService Interface
**Current Location**: `com.usyd.catams.application.course`
**Future Migration**: Will become Course Microservice

```java
public interface CourseManagementService {
    // Course Operations
    Optional<CourseDto> getCourseById(Long courseId);
    Optional<CourseDto> getCourseByCode(String courseCode);
    List<CourseDto> getCoursesByLecturer(Long lecturerId);
    List<CourseDto> getCoursesByTutor(Long tutorId);
    
    // Access Control
    boolean isLecturerOfCourse(Long userId, Long courseId);
    boolean isTutorOfCourse(Long userId, Long courseId);
    boolean canUserPerformCourseOperation(Long courseId, Long userId, String operation);
    
    // Business Logic
    boolean canAssignMoreTutors(Long courseId);
    Optional<CourseDto> getCourseBudgetInfo(Long courseId);
    List<CourseDto> getCoursesNeedingTutors();
    
    // Future REST Endpoints:
    // GET /api/courses/{courseId}
    // GET /api/courses?lecturer={lecturerId}
    // GET /api/courses/{courseId}/budget
    // POST /api/courses/{courseId}/permissions/validate
}
```

### 3.4 DecisionService (Business Rules Engine)
**Current Location**: `com.usyd.catams.application.decision`
**Future Migration**: Will become Decision Microservice (Most Critical)

```java
public interface DecisionService {
    // Core Decision Making
    DecisionResult evaluate(DecisionRequest request);
    CompletableFuture<DecisionResult> evaluateAsync(DecisionRequest request);
    
    // Validation Operations
    ValidationResult validateTimesheet(DecisionRequest request);
    ValidationResult validateWorkflowTransition(WorkflowEvaluationRequest request);
    ValidationResult validateFinancialConstraints(DecisionRequest request);
    
    // Permission & Authorization
    boolean checkPermission(PermissionCheckRequest request);
    ValidationResult checkUserEligibility(PermissionCheckRequest request);
    
    // Workflow Management
    List<ApprovalAction> getValidActions(WorkflowEvaluationRequest request);
    ApprovalStatus getNextStatus(ApprovalAction action, ApprovalStatus currentStatus, 
                                UserRole userRole, DecisionRequest context);
    
    // Rule Management
    String getRuleExplanation(String ruleId);
    List<String> getApplicableRules(DecisionRequest request);
    ValidationResult validateRuleConsistency(String ruleSetId);
    
    // Advanced Features
    List<ValidationResult> batchValidate(List<DecisionRequest> requests);
    DecisionResult getRecommendations(DecisionRequest request);
    DecisionResult getRulePerformanceMetrics();
    
    // Future REST Endpoints:
    // POST /api/decisions/evaluate
    // POST /api/decisions/validate-timesheet
    // POST /api/decisions/check-permission
    // GET /api/decisions/valid-actions
    // POST /api/decisions/recommendations
}
```

## 4. Data Transfer Objects (DTOs)

### 4.1 Design Principles
- **Immutable**: All DTOs are immutable with builder patterns
- **JSON-Ready**: Designed for future REST API serialization
- **Business Logic**: Contains computed properties and validation methods
- **Version Tolerance**: Designed to handle API evolution

### 4.2 Core DTOs

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
    
    // Business Logic Methods
    public boolean hasPermission(String permission);
    public boolean canApproveTimesheets();
    public boolean isInRole(UserRole role);
    public String getRoleDisplayName();
}
```

#### CourseDto
```java
public class CourseDto {
    private final Long id;
    private final String courseCode;
    private final String courseName;
    private final String semester;
    private final Integer year;
    private final Long lecturerId;
    private final String lecturerName;
    private final boolean active;
    private final Integer maxTutors;
    private final Integer currentTutors;
    private final BigDecimal budgetLimit;
    private final BigDecimal budgetUsed;
    private final BigDecimal defaultHourlyRate;
    
    // Business Logic Methods
    public boolean hasTutorSlots();
    public BigDecimal getRemainingBudget();
    public boolean hasSufficientBudget(BigDecimal amount);
    public String getFullCourseName();
    public boolean isCurrentlyActive();
}
```

#### DecisionRequest
```java
public class DecisionRequest {
    private final String ruleSetId;
    private final String requestId;
    private final Map<String, Object> facts;
    private final String userId;
    private final Integer priority;
    private final LocalDateTime timestamp;
    
    // Type-safe fact retrieval
    public <T> T getFact(String key, Class<T> type);
    public boolean hasFact(String key);
    public Set<String> getFactKeys();
}
```

## 5. Business Rules Engine Architecture

### 5.1 WorkflowRulesRegistry (SSOT)
The `WorkflowRulesRegistry` serves as the Single Source of Truth for all business rules:

```java
// Static registry with comprehensive rule definitions
public final class WorkflowRulesRegistry {
    // Core workflow rules
    public static boolean canPerformAction(ApprovalAction action, UserRole userRole, 
                                          ApprovalStatus status, User user, WorkflowContext context);
    public static ApprovalStatus getTargetStatus(ApprovalAction action, UserRole userRole, 
                                                ApprovalStatus currentStatus);
    public static List<ApprovalAction> getValidActions(UserRole userRole, ApprovalStatus status, 
                                                      User user, WorkflowContext context);
    
    // Rule metadata and explanations
    public static String getRuleDescription(ApprovalAction action, UserRole userRole, 
                                           ApprovalStatus status);
    public static Map<RuleKey, WorkflowRule> getAllRules();
    public static List<String> validateRules();
}
```

### 5.2 Rule Evaluation Process
```
Request → DecisionService → WorkflowRulesRegistry → Decision
   ↓
Facts Extraction → Rule Selection → Rule Execution → Result Aggregation
   ↓
ValidationResult | DecisionResult | RecommendationResult
```

## 6. Implementation Status & Migration Path

### 6.1 Completed Phase 1: Service Boundary Preparation
✅ **UserManagementService**: Interface and implementation complete
✅ **DecisionService**: Complete business rules engine with 22+ methods
✅ **CourseManagementService**: Interface defined, implementation in progress
🔄 **TimesheetServicePort**: Pending (next high-priority task)

### 6.2 Future Phase 2: Event-Driven Communication
📋 **Domain Events**: Define events for service communication
📋 **Event Publishers**: Dual-mode (in-process/message queue)
📋 **Event Handlers**: Cross-service communication preparation

### 6.3 Future Phase 3: Database Schema Organization
📋 **Schema Separation**: Organize by service boundaries
📋 **Migration Scripts**: Prepare for database separation
📋 **Data Access Isolation**: Repository pattern enforcement

## 7. Technology Stack & Implementation

### 7.1 Current Implementation
- **Framework**: Spring Boot 3.x
- **Architecture Pattern**: Port-Adapter (Hexagonal)
- **Service Layer**: Application Services implementing interfaces
- **Data Layer**: JPA entities with rich domain models
- **Business Rules**: WorkflowRulesRegistry + DecisionService
- **Testing**: TDD with comprehensive test coverage

### 7.2 Microservices Migration Technology Stack
- **Service Communication**: REST APIs (Spring Boot)
- **Service Discovery**: Spring Cloud
- **API Gateway**: Spring Cloud Gateway
- **Message Queues**: RabbitMQ/Apache Kafka
- **Distributed Tracing**: Spring Cloud Sleuth
- **Configuration**: Spring Cloud Config
- **Database per Service**: PostgreSQL instances

## 8. Benefits & Trade-offs

### 8.1 Benefits of Microservices-Ready Architecture
✅ **Gradual Migration**: No big-bang refactoring required
✅ **Service Isolation**: Clear boundaries prevent coupling
✅ **Technology Evolution**: Each service can evolve independently
✅ **Team Scalability**: Different teams can own different services
✅ **Business Alignment**: Services align with business capabilities

### 8.2 Current Trade-offs
⚠️ **Complexity**: More interfaces and abstractions than simple monolith
⚠️ **Development Overhead**: More boilerplate code for service boundaries
⚠️ **Testing Complexity**: Integration testing across service boundaries

### 8.3 Future Benefits (Post-Migration)
🎯 **Independent Deployment**: Deploy services independently
🎯 **Elastic Scaling**: Scale services based on demand
🎯 **Fault Isolation**: Service failures don't cascade
🎯 **Technology Diversity**: Use best tool for each service

## 9. Security & Cross-Cutting Concerns

### 9.1 Security Architecture
- **Authentication**: JWT tokens with Spring Security
- **Authorization**: Role-based access control (RBAC) via DecisionService
- **Service-to-Service**: Future OAuth2 service authentication
- **Data Protection**: Audit trails and encryption at rest

### 9.2 Monitoring & Observability
- **Application Metrics**: Spring Boot Actuator
- **Business Metrics**: DecisionService performance tracking
- **Future Distributed Tracing**: Request tracking across services
- **Health Checks**: Service health endpoints

### 9.3 Error Handling & Resilience
- **Circuit Breaker Pattern**: Prepared for service failures
- **Retry Logic**: Configured for service communication
- **Graceful Degradation**: Fallback mechanisms
- **Comprehensive Logging**: Structured logging with correlation IDs

## 10. Testing Strategy

### 10.1 Current Testing Approach
- **Unit Tests**: Individual service method testing
- **Integration Tests**: Cross-service integration testing
- **Contract Tests**: Interface compliance verification
- **TDD Methodology**: Test-first development approach

### 10.2 Future Microservices Testing
- **Service Contract Testing**: API contract verification
- **End-to-End Testing**: Cross-service workflow testing
- **Chaos Engineering**: Service failure simulation
- **Performance Testing**: Service-level load testing

---

## Appendix A: Migration Timeline

| Phase | Duration | Scope | Status |
|-------|----------|-------|--------|
| Phase 1a: User Service | ✅ Complete | UserManagementService interface + implementation | Done |
| Phase 1b: Decision Service | ✅ Complete | DecisionService with comprehensive business rules | Done |
| Phase 1c: Course Service | 🔄 In Progress | CourseManagementService implementation | 80% |
| Phase 1d: Timesheet Service | 📋 Planned | TimesheetServicePort interface | Next |
| Phase 2: Events Infrastructure | 📋 Planned | Domain events and publishers | Q2 2025 |
| Phase 3: Database Separation | 📋 Planned | Schema organization and migration | Q3 2025 |
| Phase 4: Service Extraction | 📋 Future | Actual microservices deployment | Q4 2025 |

## Appendix B: Service Interface Catalog

| Service | Methods Count | REST Endpoints (Future) | Key Responsibilities |
|---------|---------------|------------------------|---------------------|
| UserManagementService | 12 | `/api/users/*` | Authentication, Authorization, User CRUD |
| CourseManagementService | 16 | `/api/courses/*` | Course CRUD, Budget, Capacity Management |
| DecisionService | 22 | `/api/decisions/*` | Business Rules, Validation, Workflow Logic |
| TimesheetService (Future) | ~15 | `/api/timesheets/*` | Timesheet CRUD, Approval Flow |

---

**Document Version:** v2.0  
**Creation Date:** 2025-08-06  
**Update Date:** 2025-08-06  
**Author:** Development Team  
**Architecture Status:** Microservices-Ready Monolith (Phase 1 ~80% Complete)  
**Next Review:** Phase 1 completion + Phase 2 planning
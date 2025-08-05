# Project Structure Document - v2.0 (Microservices-Ready Architecture)

## Purpose
Define the project's directory structure for the **Microservices-Ready Monolith** architecture, facilitating AI-assisted development and future service extraction.

*Standardized directory layout ensuring clear service boundaries, proper separation of concerns, and future microservices evolution path*

## 1. Root Directory Structure

```
Casual-Academic-Time-Allocation-Management-System/
├── .bmad-core/                    # BMad tool configuration and templates
│   ├── core-config.yaml          # Core configuration file
│   ├── tasks/                     # Task definitions
│   ├── templates/                 # Code templates
│   └── checklists/               # Quality checklists
├── docs/                         # Project documentation
│   ├── architecture/             # Architecture design documents
│   │   ├── architecture-v2.0-microservices-ready.md
│   │   ├── project-structure-v2.0.md (this document)
│   │   ├── service-interfaces.md
│   │   ├── migration-guide.md
│   │   └── testing-strategy.md
│   ├── stories/                  # User story documents
│   ├── openapi/                  # API specifications
│   └── testing/                  # Testing documentation
├── src/                          # Source code directory
│   ├── main/                     # Main program source code
│   └── test/                     # Test code
├── target/                       # Maven build output (auto-generated)
├── .gitignore                    # Git ignore file configuration
├── docker-compose.yml            # Docker local environment configuration
├── Dockerfile                    # Docker container build file
├── pom.xml                       # Maven project configuration
└── README.md                     # Project documentation
```

## 2. Microservices-Ready Source Code Structure

### 2.1 Application Layer (Service Boundaries)
```
src/main/java/com/usyd/catams/application/
├── user/                         # User Management Service Boundary
│   ├── UserManagementService.java          # Interface (Future REST API)
│   ├── UserApplicationService.java         # Implementation
│   └── dto/
│       ├── UserDto.java                    # Immutable DTO with business logic
│       ├── CreateUserRequest.java          # Request DTO
│       ├── UpdateUserRequest.java          # Request DTO
│       └── UserSearchCriteria.java         # Query DTO
├── course/                       # Course Management Service Boundary  
│   ├── CourseManagementService.java        # Interface (Future REST API)
│   ├── CourseApplicationService.java       # Implementation
│   └── dto/
│       ├── CourseDto.java                  # Rich DTO with capacity/budget logic
│       ├── CourseCreateRequest.java        # Request DTO
│       └── CourseBudgetInfo.java           # Specialized DTO
├── decision/                     # Decision Service (Business Rules Engine)
│   ├── DecisionService.java               # Central business rules interface
│   ├── DecisionApplicationService.java    # Implementation
│   └── dto/
│       ├── DecisionRequest.java            # Flexible facts-based request
│       ├── DecisionResult.java             # Rich result with violations/recommendations
│       ├── ValidationResult.java          # Simple validation outcome
│       ├── PermissionCheckRequest.java     # Permission validation request
│       └── WorkflowEvaluationRequest.java  # Workflow-specific request
└── timesheet/                    # Timesheet Service Boundary (Future)
    ├── TimesheetServicePort.java          # Interface (To be implemented)
    ├── TimesheetApplicationService.java   # Implementation (Future)
    └── dto/
        ├── TimesheetDto.java               # Timesheet data transfer
        ├── TimesheetCreateRequest.java     # Creation request
        ├── TimesheetUpdateRequest.java     # Update request
        └── ApprovalHistoryDto.java         # Approval history
```

### 2.2 Domain Layer (Core Business Logic)
```
src/main/java/com/usyd/catams/domain/
├── rules/                        # Business Rules (Single Source of Truth)
│   ├── WorkflowRulesRegistry.java         # Central rules registry (Static)
│   └── BusinessRules.java                 # Additional rule definitions
├── service/                      # Domain services
│   ├── ApprovalDomainService.java         # Approval workflow logic
│   └── TimesheetDomainService.java        # Timesheet business logic
└── model/                        # Rich domain models (Future)
    ├── WorkflowContext.java               # Workflow evaluation context
    └── ApprovalChain.java                 # Approval chain representation
```

### 2.3 Infrastructure Layer
```
src/main/java/com/usyd/catams/
├── entity/                       # JPA entities (database layer)
│   ├── User.java                          # User entity
│   ├── Course.java                        # Course entity with Money/CourseCode VOs
│   ├── Timesheet.java                     # Timesheet entity
│   └── Approval.java                      # Approval entity
├── repository/                   # Data access layer
│   ├── UserRepository.java                # User data access
│   ├── CourseRepository.java              # Course data access  
│   ├── TimesheetRepository.java           # Timesheet data access
│   └── ApprovalRepository.java            # Approval data access
├── common/                       # Shared infrastructure
│   ├── domain/
│   │   └── model/
│   │       ├── CourseCode.java            # Course code value object
│   │       └── Money.java                 # Money value object
│   ├── application/              # Shared application infrastructure
│   │   ├── ApplicationService.java       # Base application service
│   │   └── EventPublisher.java           # Event publishing (Future Phase 2)
│   └── validation/               # Custom validation
│       ├── ValidCourseCode.java           # Course code validation
│       └── ValidMoneyAmount.java          # Money validation
├── controller/                   # REST API controllers (Adapters)
│   ├── UserController.java               # User endpoints
│   ├── TimesheetController.java          # Timesheet endpoints
│   ├── ApprovalController.java           # Approval endpoints
│   └── DashboardController.java          # Dashboard endpoints
├── config/                       # Configuration classes
│   ├── ApplicationConfig.java            # Main application configuration
│   ├── SecurityConfig.java              # Security configuration  
│   ├── JpaConfig.java                    # Database configuration
│   └── ServiceConfig.java               # Service boundary configuration
├── enums/                        # System enums
│   ├── UserRole.java                     # User roles
│   ├── ApprovalStatus.java              # Approval statuses
│   └── ApprovalAction.java              # Approval actions
├── dto/                          # Legacy DTOs (being migrated to service boundaries)
│   └── response/
│       ├── ApprovalActionResponse.java   # Approval response DTO
│       └── DashboardSummary.java         # Dashboard summary DTO
├── security/                     # Security components
│   ├── JwtTokenProvider.java            # JWT token management
│   ├── JwtAuthenticationFilter.java     # JWT filter
│   └── CustomUserDetailsService.java    # User details service
├── service/                      # Legacy service layer (being refactored)
│   ├── TimesheetService.java            # Timesheet service interface
│   └── impl/
│       └── TimesheetServiceImpl.java     # Implementation
└── exception/                    # Exception handling
    ├── BusinessException.java           # Business exceptions
    ├── ResourceNotFoundException.java   # Resource not found
    └── ValidationException.java         # Validation exceptions
```

## 3. Testing Structure (Service-Oriented Testing)

### 3.1 Test Organization by Service Boundaries
```
src/test/java/com/usyd/catams/
├── application/                  # Service boundary tests
│   ├── user/
│   │   ├── UserManagementServiceTest.java       # Interface contract tests
│   │   ├── UserApplicationServiceTest.java      # Implementation tests
│   │   ├── UserApplicationServiceIntegrationTest.java # Integration tests
│   │   └── dto/
│   │       └── UserDtoTest.java                 # DTO tests
│   ├── course/
│   │   ├── CourseManagementServiceTest.java     # Interface contract tests
│   │   ├── CourseApplicationServiceTest.java    # Implementation tests
│   │   └── dto/
│   │       └── CourseDtoTest.java               # DTO tests
│   ├── decision/
│   │   ├── DecisionServiceTest.java             # Comprehensive TDD tests (150+ scenarios)
│   │   ├── DecisionApplicationServiceTest.java  # Implementation tests
│   │   └── dto/
│   │       ├── DecisionRequestTest.java         # Request DTO tests
│   │       └── DecisionResultTest.java          # Result DTO tests
│   └── timesheet/                               # Future timesheet service tests
├── domain/                       # Domain layer tests
│   ├── rules/
│   │   └── WorkflowRulesRegistryTest.java      # Business rules tests
│   └── service/
│       ├── ApprovalDomainServiceTest.java      # Domain service tests
│       └── TimesheetDomainServiceTest.java     # Domain service tests
├── integration/                  # Cross-service integration tests
│   ├── TimesheetApprovalWorkflowIntegrationTest.java # End-to-end workflow
│   ├── UserManagementIntegrationTest.java      # User service integration
│   └── DashboardControllerIntegrationTest.java # Dashboard integration
├── contract/                     # API contract tests
│   └── api/
│       └── TimesheetApiContractTest.java       # API contract verification
├── entity/                       # Entity tests
│   ├── UserEntityTest.java                    # Entity behavior tests
│   ├── CourseEntityTest.java                  # Entity with value objects
│   ├── TimesheetEntityTest.java               # Entity behavior tests
│   └── ApprovalEntityTest.java                # Entity behavior tests
├── repository/                   # Repository tests
│   ├── UserRepositoryTest.java                # Data access tests
│   ├── CourseRepositoryTest.java              # Repository with custom queries
│   └── TimesheetRepositoryTest.java           # Repository tests
├── controller/                   # Controller tests
│   ├── UserControllerTest.java                # REST endpoint tests
│   ├── TimesheetControllerTest.java           # Controller integration tests
│   └── DashboardControllerTest.java           # Dashboard API tests
├── common/                       # Common infrastructure tests
│   ├── domain/
│   │   └── model/
│   │       ├── CourseCodeTest.java            # Value object tests
│   │       └── MoneyTest.java                 # Money value object tests
│   └── validation/
│       └── ValidationTest.java                # Custom validation tests
└── testdata/                     # Test data builders
    ├── TestDataBuilder.java                  # Main test data builder
    ├── UserTestDataBuilder.java              # User test data
    └── CourseTestDataBuilder.java            # Course test data
```

## 4. Service Boundary Interface Patterns

### 4.1 Service Interface Design Pattern
All service interfaces follow consistent patterns for future REST API extraction:

```java
// Pattern: {Domain}ManagementService
public interface UserManagementService {
    // CRUD Operations (Future: REST endpoints)
    Optional<UserDto> getUserById(Long userId);           // GET /api/users/{userId}
    List<UserDto> getUsersByRole(UserRole role);          // GET /api/users?role={role}
    UserDto createUser(CreateUserRequest request);        // POST /api/users
    void updateUser(Long userId, UpdateUserRequest req);  // PUT /api/users/{userId}
    
    // Business Operations
    boolean hasPermission(Long userId, String permission); // GET /api/users/{userId}/permissions/{permission}
    List<UserDto> searchUsers(UserSearchCriteria criteria); // POST /api/users/search
}
```

### 4.2 DTO Design Pattern
All DTOs are immutable with builder pattern and business logic methods:

```java
public class UserDto {
    private final Long id;
    private final String email;
    private final UserRole role;
    // ... other fields
    
    // Builder pattern for construction
    public static Builder builder() { return new Builder(); }
    
    // Business logic methods
    public boolean hasPermission(String permission) { /* logic */ }
    public boolean canApproveTimesheets() { /* logic */ }
    public String getDisplayName() { /* logic */ }
}
```

## 5. Migration Phases and Directory Evolution

### 5.1 Phase 1: Service Boundary Preparation (Current - 80% Complete)
✅ **Completed:**
- `application/user/` - UserManagementService with full implementation
- `application/decision/` - DecisionService as business rules engine  
- `application/course/dto/` - CourseDto with rich business logic

🔄 **In Progress:**
- `application/course/CourseApplicationService.java` - Implementation
- `application/timesheet/` - TimesheetServicePort interface

### 5.2 Phase 2: Event-Driven Communication (Future)
📋 **Planned Structure:**
```
src/main/java/com/usyd/catams/
├── events/                       # Domain events
│   ├── user/
│   │   ├── UserCreatedEvent.java
│   │   └── UserRoleChangedEvent.java
│   ├── timesheet/
│   │   ├── TimesheetSubmittedEvent.java
│   │   └── TimesheetApprovedEvent.java
│   └── course/
│       └── CourseBudgetExceededEvent.java
├── messaging/                    # Event infrastructure  
│   ├── EventPublisher.java
│   ├── EventHandler.java
│   └── MessageBrokerConfig.java
```

### 5.3 Phase 3: Database Schema Organization (Future)
📋 **Planned Structure:**
```
src/main/resources/db/
├── migration/
│   ├── user-service/             # User service schema
│   ├── course-service/           # Course service schema  
│   ├── decision-service/         # Decision service schema
│   └── timesheet-service/        # Timesheet service schema
```

## 6. File Naming Conventions

### 6.1 Service Boundary Components
- **Service Interface**: `{Domain}ManagementService.java`
- **Service Implementation**: `{Domain}ApplicationService.java`
- **Service DTOs**: `{Entity}Dto.java`, `{Action}{Entity}Request.java`
- **Service Tests**: `{Domain}ManagementServiceTest.java`

### 6.2 Decision Service Components
- **Main Interface**: `DecisionService.java`
- **Implementation**: `DecisionApplicationService.java`
- **Request DTOs**: `DecisionRequest.java`, `{Specific}Request.java`
- **Result DTOs**: `DecisionResult.java`, `ValidationResult.java`

### 6.3 Domain Components
- **Rules Registry**: `{Domain}RulesRegistry.java`
- **Domain Services**: `{Domain}DomainService.java`
- **Value Objects**: `{Concept}.java` (e.g., `CourseCode.java`, `Money.java`)

## 7. Code Organization Principles

### 7.1 Service Boundary Principles
- **Clear Interfaces**: Each service has a well-defined public interface
- **Immutable DTOs**: All data transfer objects are immutable
- **No Entity Leakage**: Entities never cross service boundaries
- **Future-Ready APIs**: Interfaces designed to become REST endpoints

### 7.2 Dependency Direction Rules
```
Controllers -> Application Services -> Domain Services -> Repositories -> Entities
     ↑                ↑                      ↑               ↑
   DTOs          Service DTOs           Domain Models    Entity Models

Horizontal Dependencies (Same Layer):
Application Service -> Application Service (via interfaces only)
```

### 7.3 Business Logic Placement
- **DecisionService**: All business rules and validation logic
- **Application Services**: Coordination and data transformation  
- **Domain Services**: Core domain operations
- **Entities**: Data persistence and basic validation
- **DTOs**: Data transfer and computed properties

## 8. Testing Strategy by Architecture Layer

### 8.1 Service Interface Testing (Contract Tests)
- **Unit Tests**: Interface method behavior
- **Integration Tests**: Cross-service integration
- **Contract Tests**: API contract compliance
- **TDD Approach**: Test-first development for all services

### 8.2 Decision Service Testing (Business Rules)
- **Comprehensive Rule Testing**: 150+ test scenarios
- **Performance Testing**: Rule execution metrics
- **Edge Case Testing**: Boundary conditions and error handling
- **Workflow Testing**: Complete approval workflow scenarios

### 8.3 End-to-End Testing
- **Workflow Integration**: Complete business processes
- **Cross-Service Testing**: Multi-service scenarios
- **Data Consistency**: Transaction boundary testing

## 9. Documentation Structure

### 9.1 Architecture Documentation
- `architecture-v2.0-microservices-ready.md` - Main architecture document
- `service-interfaces.md` - Service interface catalog
- `migration-guide.md` - Microservices migration guide
- `testing-strategy.md` - Testing approach documentation

### 9.2 API Documentation  
- `openapi/` - OpenAPI specifications for each service
- Service-specific API documentation
- Contract test specifications

---

**Document Version**: v2.0  
**Creation Date**: 2025-08-06  
**Applicable Project**: CATAMS (Microservices-Ready Architecture)  
**Architecture Phase**: Phase 1 Service Boundaries (80% Complete)  
**Next Phase**: Complete CourseApplicationService + TimesheetServicePort
**Maintainer**: Development Team
# CATAMS - Casual Academic Time Allocation Management System v2.0

A comprehensive full-stack web application built with **Microservices-Ready Architecture** for managing casual academic staff time allocation, timesheet submission, and approval workflows at universities.

## 🎯 Project Overview

CATAMS streamlines the administrative processes for casual academic staff (tutors, demonstrators, markers) by providing:

- **Timesheet Management** - Digital submission and tracking with comprehensive validation
- **Centralized Business Rules** - Single Source of Truth for all approval workflows  
- **Service-Oriented Architecture** - Future-ready microservices boundaries
- **Role-Based Access** - Granular permissions through DecisionService
- **Real-time Tracking** - Live status updates and comprehensive audit trails
- **Advanced Reporting** - Analytics, budget management, and performance metrics

## 🏗️ Architecture v2.0 - Microservices-Ready Monolith

### Architecture Evolution
CATAMS has evolved from a traditional monolith to a **Microservices-Ready Monolith** that maintains development simplicity while preparing for future service extraction through well-defined boundaries.

### Service Architecture Overview
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  UserManagement     │    │  CourseManagement   │    │  DecisionService    │
│  Service ✅         │    │  Service 🔄         │    │  (Business Rules) ✅│
│                     │    │                     │    │                     │
│  - Authentication   │    │  - Course CRUD      │    │  - Rule Evaluation  │
│  - Authorization    │    │  - Budget Tracking  │    │  - Workflow Logic   │
│  - User Operations  │    │  - Capacity Mgmt    │    │  - Validation       │
│  - Role Management  │    │  - Lecturer Mgmt    │    │  - Permissions      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
                    ┌─────────────────────┐
                    │  TimesheetService   │
                    │  📋 Planned         │
                    │                     │
                    │  - Timesheet CRUD   │
                    │  - Approval Flow    │
                    │  - History Mgmt     │
                    └─────────────────────┘
```

### Technology Stack

**Backend (Spring Boot):**
- Java 17 with Spring Boot 3.x
- **Service Boundaries**: Port-Adapter pattern with clear interfaces
- **Business Rules Engine**: Centralized DecisionService (22+ methods)
- **Domain-Driven Design**: Rich value objects (CourseCode, Money)
- Spring Security with JWT authentication
- Spring Data JPA with PostgreSQL
- **Comprehensive Testing**: TDD approach with 150+ test scenarios

**Architecture Patterns:**
- **Port-Adapter (Hexagonal)**: Service boundaries ready for REST API extraction
- **Single Source of Truth**: WorkflowRulesRegistry for all business rules
- **Event-Ready**: Infrastructure prepared for future event-driven communication
- **DTO-First**: Immutable DTOs with business logic for JSON serialization

**Frontend (React):**
- React 18 with TypeScript
- Vite for build tooling
- Axios for API communication
- Context API for state management
- 143 tests across Unit, Component, and E2E levels

## 🚀 Quick Start

### Prerequisites

- **Java 17+** and Maven 3.6+
- **Node.js 18+** and npm
- **Git** for version control
- **Modern browser** (Chrome, Firefox, Safari, Edge)

### 1. Clone Repository

```bash
git clone <repository-url>
cd Casual-Academic-Time-Allocation-Management-System
```

### 2. Start Backend

```bash
# Start Spring Boot application
mvn spring-boot:run

# Alternative: Run with specific profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Backend will be available at `http://localhost:8080`

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 4. Login & Test

Open `http://localhost:5173` and login with test credentials:

- **👨‍💼 Admin**: `admin@example.com` / `Admin123!`
- **👩‍🏫 Lecturer**: `lecturer@example.com` / `Lecturer123!`  
- **👨‍🎓 Tutor**: `tutor@example.com` / `Tutor123!`

## 📁 Microservices-Ready Project Structure

```
CATAMS/
├── src/main/java/com/usyd/catams/
│   │
│   ├── application/                # Service Boundary Layer (Microservices-Ready)
│   │   ├── user/                   # User Management Service Boundary ✅
│   │   │   ├── UserManagementService.java      # Interface (Future REST API)
│   │   │   ├── UserApplicationService.java     # Implementation
│   │   │   └── dto/
│   │   │       ├── UserDto.java                # Rich DTO with business logic
│   │   │       ├── CreateUserRequest.java      # Request DTO
│   │   │       └── UserSearchCriteria.java     # Query DTO
│   │   │
│   │   ├── course/                 # Course Management Service Boundary 🔄
│   │   │   ├── CourseManagementService.java    # Interface (16 methods)
│   │   │   ├── CourseApplicationService.java   # Implementation (80% complete)
│   │   │   └── dto/
│   │   │       ├── CourseDto.java              # Rich DTO with budget/capacity logic
│   │   │       └── CourseCreateRequest.java    # Request DTO
│   │   │
│   │   ├── decision/               # Decision Service (Business Rules Engine) ✅
│   │   │   ├── DecisionService.java            # Central business rules (22 methods)
│   │   │   ├── DecisionApplicationService.java # Implementation
│   │   │   └── dto/
│   │   │       ├── DecisionRequest.java        # Flexible facts-based request
│   │   │       ├── DecisionResult.java         # Rich result with violations/recommendations
│   │   │       ├── ValidationResult.java      # Simple validation outcome
│   │   │       ├── PermissionCheckRequest.java # Permission validation
│   │   │       └── WorkflowEvaluationRequest.java # Workflow evaluation
│   │   │
│   │   └── timesheet/              # Timesheet Service Boundary 📋 Planned
│   │       ├── TimesheetServicePort.java       # Interface (To be implemented)
│   │       └── dto/
│   │           ├── TimesheetDto.java           # Timesheet data transfer
│   │           └── TimesheetCreateRequest.java # Creation request
│   │
│   ├── domain/                     # Domain Layer (Business Logic)
│   │   ├── rules/
│   │   │   └── WorkflowRulesRegistry.java      # Single Source of Truth for business rules
│   │   └── service/
│   │       ├── ApprovalDomainService.java      # Domain services
│   │       └── TimesheetDomainService.java
│   │
│   ├── common/                     # Shared Infrastructure
│   │   ├── domain/model/
│   │   │   ├── CourseCode.java                 # Course code value object
│   │   │   └── Money.java                      # Money value object
│   │   └── application/
│   │       └── ApplicationService.java         # Base application service
│   │
│   ├── entity/                     # JPA Entities (Database Layer)
│   ├── repository/                 # Data Access Layer
│   ├── controller/                 # REST Controllers (Adapters)
│   ├── config/                     # Configuration
│   └── security/                   # Security Components
│
├── src/test/java/                  # Testing (Service-Oriented)
│   ├── application/                # Service boundary tests
│   │   ├── user/
│   │   │   ├── UserManagementServiceTest.java  # Contract tests
│   │   │   └── UserApplicationServiceTest.java # Implementation tests
│   │   ├── course/
│   │   │   └── CourseManagementServiceTest.java
│   │   └── decision/
│   │       ├── DecisionServiceTest.java        # 150+ comprehensive test scenarios
│   │       └── DecisionApplicationServiceTest.java
│   ├── integration/                # Cross-service integration tests
│   ├── contract/                   # API contract tests
│   └── testdata/                   # Test data builders
│
├── docs/                           # Architecture Documentation v2.0
│   ├── architecture/
│   │   ├── architecture-v2.0-microservices-ready.md    # Main architecture
│   │   ├── project-structure-v2.0.md                  # Updated project structure
│   │   ├── service-interfaces.md                      # Service catalog
│   │   └── migration-guide.md                         # Migration strategy
│   ├── openapi/                    # API specifications
│   └── testing/                    # Testing strategies
│
└── frontend/                       # React Frontend Application
    └── [Frontend structure unchanged]
```

## 🧪 Testing Strategy

### Service-Oriented Testing Approach

**Service Boundary Testing:**
- **Contract Tests**: Interface compliance and DTO serialization
- **TDD Implementation**: Test-first development for all services  
- **Cross-Service Integration**: End-to-end workflow testing

**Test Coverage by Service:**

| Service | Test Methods | Focus Areas |
|---------|--------------|-------------|
| UserManagementService | 35+ | Authentication, Authorization, User CRUD |
| CourseManagementService | 45+ | Course Logic, Budget, Capacity Management |
| **DecisionService** | **150+** | **Business Rules, Validation, Workflow Logic** |
| TimesheetService (Planned) | ~40+ | CRUD, Approval Flow, History Management |

### Running Tests

**Backend:**
```bash
# Run all tests
mvn test

# Run service-specific tests
mvn test -Dtest="*ManagementServiceTest"
mvn test -Dtest="DecisionServiceTest"        # Business rules engine tests

# Generate comprehensive coverage report
mvn jacoco:report
```

**Service Integration Testing:**
```bash
# Cross-service workflow tests
mvn test -Dtest="*IntegrationTest"
mvn test -Dtest="TimesheetApprovalWorkflowIntegrationTest"
```

## 🔧 Service Development

### Service Interface Development Pattern

Each service follows a consistent pattern for future REST API extraction:

```java
// Service Interface (Future REST API)
public interface UserManagementService {
    Optional<UserDto> getUserById(Long userId);           // GET /api/users/{userId}
    List<UserDto> getUsersByRole(UserRole role);          // GET /api/users?role={role}
    UserDto createUser(CreateUserRequest request);        // POST /api/users
    boolean hasPermission(Long userId, String permission); // GET /api/users/{userId}/permissions/{permission}
    // ... 8 more methods
}

// Rich DTO with Business Logic
public class UserDto {
    private final Long id;
    private final String email;
    private final UserRole role;
    // ... other immutable fields
    
    // Business logic methods
    public boolean hasPermission(String permission) { /* logic */ }
    public boolean canApproveTimesheets() { /* logic */ }
    public String getDisplayName() { /* logic */ }
}
```

### DecisionService (Business Rules Engine)

The centerpiece of our architecture - centralizes ALL business logic:

```java
public interface DecisionService {
    // Core decision evaluation
    DecisionResult evaluate(DecisionRequest request);                    // POST /api/decisions/evaluate
    CompletableFuture<DecisionResult> evaluateAsync(DecisionRequest request); // Async evaluation
    
    // Validation operations  
    ValidationResult validateTimesheet(DecisionRequest request);         // POST /api/decisions/validate-timesheet
    ValidationResult validateWorkflowTransition(WorkflowEvaluationRequest request);
    ValidationResult validateFinancialConstraints(DecisionRequest request);
    
    // Permission & authorization
    boolean checkPermission(PermissionCheckRequest request);             // POST /api/decisions/check-permission
    
    // Workflow management
    List<ApprovalAction> getValidActions(WorkflowEvaluationRequest request); // POST /api/decisions/valid-actions
    ApprovalStatus getNextStatus(ApprovalAction action, ApprovalStatus currentStatus, UserRole userRole, DecisionRequest context);
    
    // Advanced features
    DecisionResult getRecommendations(DecisionRequest request);          // AI-like suggestions
    DecisionResult getRulePerformanceMetrics();                         // Performance monitoring
    List<ValidationResult> batchValidate(List<DecisionRequest> requests); // Batch processing
    // ... 10+ more methods
}
```

## 📊 Features

### Enhanced Features v2.0

**For Tutors/Casual Staff:**
- ⏰ Submit weekly timesheets with **intelligent validation**
- 📝 Rich work descriptions with **smart recommendations**
- 📋 Comprehensive submission history with **audit trails**
- 🔔 **Real-time notifications** via event system
- 🤖 **AI-like suggestions** from DecisionService

**For Lecturers:**
- ✅ **Streamlined approval workflow** with business rules engine
- 📊 **Advanced budget tracking** with capacity management
- 📈 **Rich analytics dashboards** with performance metrics
- 🎯 **Intelligent course management** with automatic validations
- 🔍 **Comprehensive audit trails** for all decisions

**For Administrators:**
- 👥 **Advanced user management** with role-based permissions
- 📊 **System-wide analytics** with business intelligence
- ⚙️ **Configurable business rules** through DecisionService
- 💰 **Sophisticated budget management** with forecasting
- 🔧 **Service health monitoring** and performance tracking

### Business Rules Engine Features
- **Rule Evaluation**: 150+ comprehensive business rule scenarios
- **Workflow Validation**: Complete approval workflow logic
- **Permission Checking**: Granular role-based access control
- **Financial Validation**: Budget constraints and capacity management
- **Audit Trails**: Complete decision history and explanations
- **Performance Monitoring**: Rule execution metrics and optimization

## 🏗️ Migration Path to Microservices

### Current Status: Phase 1 Service Boundaries (80% Complete)
✅ **UserManagementService** - Complete interface + implementation  
✅ **DecisionService** - Complete business rules engine (22 methods)  
🔄 **CourseManagementService** - Interface complete, implementation 80%  
📋 **TimesheetService** - Interface design pending  

### Future Phases:
- **Phase 2** (Q2 2025): Event-Driven Communication  
- **Phase 3** (Q3-Q4 2025): Service Extraction to Microservices
- **Phase 4** (2026): Full Microservices Architecture

### Service Interface Catalog
Each service is designed to become a REST microservice:

| Service | Methods | Future Endpoint | Status |
|---------|---------|-----------------|--------|
| UserManagementService | 12 | `/api/users/*` | ✅ Complete |
| CourseManagementService | 16 | `/api/courses/*` | 🔄 80% |
| **DecisionService** | **22** | `/api/decisions/*` | ✅ **Complete** |
| TimesheetService | ~15 | `/api/timesheets/*` | 📋 Planned |

## 📚 Documentation v2.0

### Architecture Documentation
- **[Main Architecture v2.0](./docs/architecture-v2.0-microservices-ready.md)** - Complete architecture overview
- **[Service Interfaces Catalog](./docs/architecture/service-interfaces.md)** - Detailed service interface documentation  
- **[Migration Guide](./docs/architecture/migration-guide.md)** - Step-by-step microservices migration strategy
- **[Project Structure v2.0](./docs/architecture/project-structure-v2.0.md)** - Updated project organization

### API Documentation
- [OpenAPI Specifications](./docs/openapi/)
- [Service Contract Tests](./src/test/java/com/usyd/catams/contract/)
- [Business Rules Documentation](./docs/timesheet-approval-workflow-ssot.md)

### Testing Documentation
- [Testing Strategy](./docs/testing/)
- [Service Testing Patterns](./docs/architecture/testing-strategy.md)
- [TDD Implementation Guide](./docs/testing/tdd-guide.md)

## 🔐 Enhanced Security v2.0

- **Centralized Authorization** - All permissions managed through DecisionService
- **Granular Role-Based Access** - 22+ permission checking methods
- **Service Boundary Security** - Each service validates its own permissions
- **Comprehensive Audit Trails** - DecisionService tracks all business decisions
- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Multi-layer validation (DTO + Business Rules + Domain)
- **Future Service Security** - OAuth2 preparation for service-to-service auth

## 🚢 Deployment

### Current: Monolith Deployment
```bash
# Build and run monolith
mvn clean package
java -jar target/catams-2.0.0.jar
```

### Future: Microservices Deployment
Each service boundary is designed for independent deployment:

```yaml
# Future docker-compose for microservices
services:
  user-service:
    image: catams/user-service:latest
    ports: ["8081:8080"]
    
  course-service:
    image: catams/course-service:latest  
    ports: ["8082:8080"]
    
  decision-service:
    image: catams/decision-service:latest
    ports: ["8083:8080"]
    
  timesheet-service:
    image: catams/timesheet-service:latest
    ports: ["8084:8080"]
```

## 📈 Performance & Monitoring

### Current Performance
- **Service Response Times**: Sub-100ms for service interface calls
- **Business Rules Engine**: <50ms for complex rule evaluation
- **Database Queries**: Optimized with proper indexing and value objects
- **Frontend Performance**: Lighthouse score 90+ across all metrics

### Built-in Monitoring
- **DecisionService Metrics**: Rule execution performance tracking
- **Service Health Indicators**: Health checks for each service boundary
- **Comprehensive Logging**: Structured logging with correlation IDs
- **Future Observability**: Prepared for distributed tracing and metrics

## 🎯 Next Steps & Roadmap

### Immediate (Current Development)
- [ ] Complete CourseApplicationService implementation
- [ ] Design and implement TimesheetServicePort interface  
- [ ] Enhanced API contract testing
- [ ] Complete service boundary documentation

### Phase 2 (Q2 2025) - Event-Driven Communication
- [ ] Implement domain events for service communication
- [ ] Create event publishers and handlers
- [ ] Message queue integration preparation
- [ ] Asynchronous workflow support

### Phase 3 (Q3-Q4 2025) - Microservices Extraction
- [ ] Extract UserManagementService as first microservice
- [ ] Extract DecisionService as business rules microservice
- [ ] Implement service-to-service communication
- [ ] API gateway and service discovery

## 🤝 Contributing to Microservices Architecture

### Service Development Guidelines
1. **Interface-First Design**: Define service interfaces before implementation
2. **DTO Immutability**: All DTOs must be immutable with builder patterns
3. **Business Logic Centralization**: Use DecisionService for all business rules
4. **Comprehensive Testing**: TDD approach with service contract tests
5. **Documentation**: Update service interface catalog for any changes

### Service Boundary Principles
- **No Entity Leakage**: Never expose JPA entities across service boundaries
- **Clear Interfaces**: Each service has well-defined public interface
- **Independent Testing**: Services can be tested in isolation
- **Future REST APIs**: Interfaces designed to become REST endpoints

---

## 🏫 University of Sydney

Developed for the University of Sydney as part of the casual academic staff management system initiative, featuring **cutting-edge microservices-ready architecture** for future scalability and maintainability.

---

**CATAMS v2.0** - *Microservices-Ready Architecture for Academic Workforce Management* 🎓

**Architecture Status**: Phase 1 Service Boundaries - 80% Complete  
**Next Milestone**: Complete CourseApplicationService + TimesheetServicePort  
**Migration Timeline**: Full Microservices by 2026
# Microservices Migration Guide - CATAMS v2.0

## Executive Summary

This document provides a comprehensive guide for migrating from the current **Microservices-Ready Monolith** to a full microservices architecture. The migration follows the **Strangler Fig Pattern**, enabling gradual service extraction without disrupting existing functionality.

## 1. Migration Strategy Overview

### 1.1 Migration Approach: Strangler Fig Pattern
The Strangler Fig pattern allows gradual migration by:
1. **Creating new services** alongside the existing monolith
2. **Routing traffic gradually** from monolith to services  
3. **Retiring monolith components** once services are proven
4. **Maintaining system availability** throughout the migration

### 1.2 Migration Phases
```
Phase 1: Service Boundaries (80% Complete)
    ↓
Phase 2: Event-Driven Communication (Q2 2025)
    ↓  
Phase 3: Service Extraction (Q3-Q4 2025)
    ↓
Phase 4: Full Microservices (2026)
```

## 2. Current State Analysis

### 2.1 Completed Service Boundaries ✅
- **UserManagementService**: Complete interface with 12 methods
- **DecisionService**: Complete business rules engine with 22 methods  
- **CourseManagementService**: Interface defined with 16 methods
- **Service DTOs**: Immutable DTOs with business logic ready for JSON serialization

### 2.2 In Progress 🔄
- **CourseApplicationService**: Implementation 80% complete
- **TimesheetServicePort**: Interface design pending

### 2.3 Technical Debt and Dependencies
- **Legacy Controllers**: Still directly accessing repositories
- **Entity Leakage**: Some controllers return entities instead of DTOs
- **Circular Dependencies**: Some services have bi-directional dependencies
- **Database Coupling**: Single database shared across all domains

## 3. Phase-by-Phase Migration Plan

### 3.1 Phase 1: Service Boundary Preparation ✅ 80% Complete

#### Goals
- Define clear service interfaces
- Implement comprehensive DTO layer
- Centralize business logic in DecisionService
- Establish testing patterns

#### Current Status
```java
✅ UserManagementService (12 methods) - Complete
✅ DecisionService (22 methods) - Complete  
🔄 CourseManagementService (16 methods) - 80% Complete
📋 TimesheetServicePort (~15 methods) - Planned

// Example: Service interface ready for REST API extraction
public interface UserManagementService {
    Optional<UserDto> getUserById(Long userId);           // GET /api/users/{userId}
    List<UserDto> getUsersByRole(UserRole role);          // GET /api/users?role={role}
    UserDto createUser(CreateUserRequest request);        // POST /api/users
    // ... 9 more methods
}
```

#### Remaining Tasks
- [ ] Complete CourseApplicationService implementation
- [ ] Design and implement TimesheetServicePort interface
- [ ] Refactor legacy controllers to use service interfaces
- [ ] Eliminate entity leakage in API responses

### 3.2 Phase 2: Event-Driven Communication 📋 Planned Q2 2025

#### Goals
- Implement domain events for service communication
- Create dual-mode event publishers (in-process + message queue)
- Prepare infrastructure for asynchronous communication
- Implement event sourcing for audit trails

#### Planned Implementation
```java
// Domain Events
@DomainEvent
public class UserCreatedEvent {
    private final Long userId;
    private final String email;
    private final UserRole role;
    private final LocalDateTime timestamp;
}

@DomainEvent  
public class TimesheetSubmittedEvent {
    private final Long timesheetId;
    private final Long tutorId;
    private final Long courseId;
    private final ApprovalStatus status;
    private final LocalDateTime timestamp;
}

// Event Publisher (Dual Mode)
@Component
public class EventPublisher {
    public void publish(DomainEvent event) {
        // Phase 2: In-process event handling
        eventBus.publish(event);
        
        // Phase 3+: Message queue publishing
        if (messageQueueEnabled) {
            messageQueue.send(event);
        }
    }
}

// Event Handlers
@EventHandler
public class UserEventHandler {
    @Subscribe
    public void handle(UserCreatedEvent event) {
        // Send welcome email
        // Update user statistics
        // Audit logging
    }
}
```

#### Infrastructure Requirements
- **Message Broker**: RabbitMQ or Apache Kafka
- **Event Store**: PostgreSQL or dedicated event store
- **Service Discovery**: Spring Cloud or Consul
- **Configuration Management**: Spring Cloud Config

#### Timeline: Q2 2025 (3 months)
- Month 1: Event infrastructure and domain events
- Month 2: Event handlers and dual-mode publishers  
- Month 3: Integration testing and performance optimization

### 3.3 Phase 3: Service Extraction 📋 Planned Q3-Q4 2025

#### Goals
- Extract first microservice (User Service)
- Implement service-to-service communication
- Set up API gateway and service discovery
- Implement distributed monitoring and logging

#### Service Extraction Priority Order
1. **UserManagementService** (Least dependencies, foundational)
2. **DecisionService** (Most critical, centralized business logic)
3. **CourseManagementService** (Moderate dependencies)
4. **TimesheetService** (Most dependencies, complex workflow)

#### User Service Extraction Example
```java
// Step 1: Create User Microservice
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    private final UserManagementService userService;
    
    @GetMapping("/{userId}")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long userId) {
        return userService.getUserById(userId)
            .map(user -> ResponseEntity.ok(user))
            .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping
    public ResponseEntity<List<UserDto>> getUsersByRole(@RequestParam UserRole role) {
        return ResponseEntity.ok(userService.getUsersByRole(role));
    }
    
    @PostMapping
    public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserDto user = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }
}

// Step 2: Create Service Client in Main Application
@Component
public class UserServiceClient implements UserManagementService {
    
    private final RestTemplate restTemplate;
    
    @Override
    public Optional<UserDto> getUserById(Long userId) {
        try {
            UserDto user = restTemplate.getForObject("/api/users/{userId}", UserDto.class, userId);
            return Optional.ofNullable(user);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }
    
    // Circuit breaker, retry logic, fallback mechanisms
    @CircuitBreaker(name = "user-service")
    @Retry(name = "user-service")
    public List<UserDto> getUsersByRole(UserRole role) {
        return restTemplate.exchange(
            "/api/users?role={role}",
            HttpMethod.GET,
            null,
            new ParameterizedTypeReference<List<UserDto>>() {},
            role
        ).getBody();
    }
}
```

#### Infrastructure Components
- **API Gateway**: Spring Cloud Gateway or Kong
- **Service Discovery**: Eureka or Consul
- **Load Balancer**: Spring Cloud LoadBalancer
- **Circuit Breaker**: Resilience4j
- **Distributed Tracing**: Spring Cloud Sleuth + Zipkin
- **Centralized Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

#### Timeline: Q3-Q4 2025 (6 months)
- Q3 Month 1: Infrastructure setup and User Service extraction
- Q3 Month 2: Decision Service extraction  
- Q3 Month 3: Course Service extraction
- Q4 Month 1: Timesheet Service extraction
- Q4 Month 2: Integration testing and performance optimization
- Q4 Month 3: Production deployment and monitoring

### 3.4 Phase 4: Full Microservices 📋 Planned 2026

#### Goals
- Complete monolith retirement
- Implement database per service
- Optimize service boundaries based on production data
- Implement advanced microservices patterns

#### Advanced Patterns Implementation
- **Saga Pattern**: Distributed transaction management
- **CQRS**: Command Query Responsibility Segregation  
- **Event Sourcing**: Complete audit trails and replay capability
- **Service Mesh**: Istio or Linkerd for service communication
- **Container Orchestration**: Kubernetes deployment

## 4. Database Migration Strategy

### 4.1 Current State: Shared Database
```
┌─────────────────────────────────────────────┐
│                Monolith                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────────────┐│
│  │  User   │ │ Course  │ │   Timesheet     ││
│  │ Service │ │ Service │ │   Service       ││
│  └─────────┘ └─────────┘ └─────────────────┘│
└─────────────────┬───────────────────────────┘
                  │
         ┌────────▼────────┐
         │  PostgreSQL     │
         │  (Shared DB)    │
         └─────────────────┘
```

### 4.2 Target State: Database Per Service
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    User     │    │   Course    │    │  Decision   │    │ Timesheet   │
│ Microservice│    │Microservice │    │Microservice │    │Microservice │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
│   User DB   │    │  Course DB  │    │ Decision DB │    │Timesheet DB │
│(PostgreSQL) │    │(PostgreSQL) │    │(PostgreSQL)│    │(PostgreSQL) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 4.3 Database Migration Steps

#### Step 1: Schema Analysis and Separation
```sql
-- Current shared schema
Tables: users, courses, timesheets, approvals, audit_logs

-- Target separated schemas
User Service DB: users, user_audit_logs
Course Service DB: courses, course_audit_logs  
Decision Service DB: business_rules, rule_executions
Timesheet Service DB: timesheets, approvals, timesheet_audit_logs
```

#### Step 2: Data Migration Strategy
```java
// Database per service migration
@Component
public class DatabaseMigrationService {
    
    public void migrateUserData() {
        // 1. Create user service database
        // 2. Migrate user tables and data
        // 3. Update foreign key references
        // 4. Verify data integrity
    }
    
    public void setupDataSynchronization() {
        // During migration period, maintain data sync
        // Use CDC (Change Data Capture) or event-driven sync
    }
}
```

#### Step 3: Cross-Service Data Access
```java
// Instead of JOIN queries, use service calls
public class TimesheetApplicationService {
    
    private final UserServiceClient userService;
    private final CourseServiceClient courseService;
    
    public TimesheetDto getTimesheetWithDetails(Long timesheetId) {
        TimesheetDto timesheet = getTimesheet(timesheetId);
        
        // Service calls instead of database JOINs
        UserDto user = userService.getUserById(timesheet.getTutorId()).orElse(null);
        CourseDto course = courseService.getCourseById(timesheet.getCourseId()).orElse(null);
        
        return enrichTimesheetWithDetails(timesheet, user, course);
    }
}
```

## 5. Service Communication Patterns

### 5.1 Synchronous Communication (HTTP/REST)
```java
// Request-Response pattern for immediate data needs
@Component
public class TimesheetWorkflowService {
    
    @Autowired
    private UserServiceClient userService;
    
    @Autowired  
    private DecisionServiceClient decisionService;
    
    public void processTimesheetSubmission(Long timesheetId) {
        // Get user details
        UserDto user = userService.getUserById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
            
        // Validate submission permissions
        PermissionCheckRequest request = PermissionCheckRequest.builder()
            .userId(user.getId().toString())
            .userRole(user.getRole())
            .action("SUBMIT_TIMESHEET")
            .resourceType("TIMESHEET")
            .resourceId(timesheetId.toString())
            .build();
            
        boolean canSubmit = decisionService.checkPermission(request);
        if (!canSubmit) {
            throw new InsufficientPermissionsException();
        }
        
        // Process submission...
    }
}
```

### 5.2 Asynchronous Communication (Events)
```java
// Event-driven pattern for eventual consistency
@EventListener
public class TimesheetEventHandler {
    
    @Async
    @EventListener
    public void handleTimesheetSubmitted(TimesheetSubmittedEvent event) {
        // Update dashboard statistics
        dashboardService.updateTimesheetStats(event.getTutorId());
        
        // Send notification to approver
        notificationService.notifyApprover(event.getTimesheetId());
        
        // Update budget usage
        courseService.updateBudgetUsage(event.getCourseId(), event.getAmount());
    }
}
```

### 5.3 Service Resilience Patterns
```java
// Circuit breaker and retry patterns
@Service
public class ResilientUserServiceClient {
    
    @CircuitBreaker(name = "user-service", fallbackMethod = "getUserFallback")
    @Retry(name = "user-service")
    @TimeLimiter(name = "user-service")
    public CompletableFuture<Optional<UserDto>> getUserById(Long userId) {
        return CompletableFuture.supplyAsync(() -> {
            return restTemplate.getForObject("/api/users/{userId}", UserDto.class, userId);
        }).thenApply(Optional::ofNullable);
    }
    
    public CompletableFuture<Optional<UserDto>> getUserFallback(Long userId, Exception ex) {
        // Return cached data or default user
        return CompletableFuture.completedFuture(getCachedUser(userId));
    }
}
```

## 6. Testing Strategy During Migration

### 6.1 Phase 1: Service Interface Testing
```java
// Contract tests to ensure service interface compliance
@SpringBootTest
class UserManagementServiceContractTest {
    
    @Autowired
    private UserManagementService userService;
    
    @Test
    void shouldReturnUserById() {
        // Given
        Long userId = 1L;
        
        // When
        Optional<UserDto> result = userService.getUserById(userId);
        
        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(userId);
        // Verify DTO contract compliance
        assertThat(result.get().getEmail()).isNotNull();
        assertThat(result.get().getRole()).isNotNull();
    }
}
```

### 6.2 Phase 2: Event-Driven Testing
```java
// Event integration tests
@SpringBootTest
@TestConfiguration
class EventDrivenIntegrationTest {
    
    @Test
    void shouldHandleUserCreatedEvent() {
        // Given
        UserCreatedEvent event = new UserCreatedEvent(1L, "test@example.com", UserRole.TUTOR);
        
        // When
        eventPublisher.publish(event);
        
        // Then
        await().atMost(5, SECONDS).until(() -> {
            return notificationService.wasWelcomeEmailSent(event.getUserId());
        });
    }
}
```

### 6.3 Phase 3: Cross-Service Integration Testing
```java
// End-to-end service integration tests
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CrossServiceIntegrationTest {
    
    @Test
    void shouldCompleteTimesheetApprovalWorkflow() {
        // Given: Services are running
        // User Service, Course Service, Decision Service, Timesheet Service
        
        // When: Complete workflow
        UserDto tutor = userService.createUser(createTutorRequest());
        CourseDto course = courseService.createCourse(createCourseRequest());
        TimesheetDto timesheet = timesheetService.createTimesheet(createTimesheetRequest(tutor.getId(), course.getId()));
        
        // Submit for approval
        timesheetService.submitForApproval(timesheet.getId());
        
        // Lecturer approves
        timesheetService.approveTimesheet(timesheet.getId(), createApprovalRequest());
        
        // Then: Verify end state
        TimesheetDto approvedTimesheet = timesheetService.getTimesheetById(timesheet.getId()).orElseThrow();
        assertThat(approvedTimesheet.getStatus()).isEqualTo(ApprovalStatus.FINAL_APPROVED);
    }
}
```

## 7. Deployment and Infrastructure

### 7.1 Current Deployment: Monolith
```yaml
# docker-compose.yml - Current monolith deployment
version: '3.8'
services:
  catams-app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
    depends_on:
      - postgres
      
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=catams
      - POSTGRES_USER=catams
      - POSTGRES_PASSWORD=password
```

### 7.2 Target Deployment: Microservices
```yaml
# docker-compose-microservices.yml - Target microservices deployment  
version: '3.8'
services:
  api-gateway:
    image: catams/api-gateway:latest
    ports:
      - "8080:8080"
    environment:
      - SERVICE_DISCOVERY_URL=http://eureka:8761
      
  eureka-server:
    image: catams/eureka-server:latest  
    ports:
      - "8761:8761"
      
  user-service:
    image: catams/user-service:latest
    environment:
      - DATABASE_URL=postgres://user-db:5432/users
      - EUREKA_URL=http://eureka:8761
    depends_on:
      - user-db
      - eureka-server
      
  course-service:
    image: catams/course-service:latest
    environment:
      - DATABASE_URL=postgres://course-db:5432/courses
      - EUREKA_URL=http://eureka:8761
    depends_on:
      - course-db
      - eureka-server
      
  decision-service:
    image: catams/decision-service:latest
    environment:
      - DATABASE_URL=postgres://decision-db:5432/decisions
      - EUREKA_URL=http://eureka:8761
    depends_on:
      - decision-db
      - eureka-server
      
  timesheet-service:
    image: catams/timesheet-service:latest
    environment:
      - DATABASE_URL=postgres://timesheet-db:5432/timesheets
      - EUREKA_URL=http://eureka:8761
    depends_on:
      - timesheet-db
      - eureka-server
      
  # Databases
  user-db:
    image: postgres:15
    environment:
      - POSTGRES_DB=users
      
  course-db:
    image: postgres:15
    environment:
      - POSTGRES_DB=courses
      
  decision-db:
    image: postgres:15  
    environment:
      - POSTGRES_DB=decisions
      
  timesheet-db:
    image: postgres:15
    environment:
      - POSTGRES_DB=timesheets
      
  # Message Queue
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "15672:15672"
      - "5672:5672"
      
  # Monitoring
  zipkin:
    image: openzipkin/zipkin
    ports:
      - "9411:9411"
```

### 7.3 Kubernetes Deployment (Production)
```yaml
# k8s-deployment.yaml - Production Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: catams/user-service:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: user-db-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

## 8. Migration Risks and Mitigation

### 8.1 Technical Risks

#### Data Consistency Risk
**Risk**: Data inconsistency during database separation
**Mitigation**: 
- Implement saga pattern for distributed transactions
- Use event sourcing for audit trails
- Maintain referential integrity through service contracts
- Implement data validation at service boundaries

#### Service Availability Risk  
**Risk**: Service outages affecting dependent services
**Mitigation**:
- Implement circuit breaker pattern
- Add retry logic with exponential backoff
- Create service fallback mechanisms
- Use service health checks and auto-scaling

#### Performance Degradation Risk
**Risk**: Network latency from service calls
**Mitigation**:
- Cache frequently accessed data
- Implement asynchronous communication where appropriate
- Use connection pooling and HTTP/2
- Monitor and optimize service response times

### 8.2 Business Risks

#### Feature Delivery Slowdown
**Risk**: Migration work impacting feature development
**Mitigation**:
- Parallel development tracks (migration + features)
- Incremental migration without breaking existing features
- Clear milestone and rollback plans
- Regular stakeholder communication

#### System Complexity Increase
**Risk**: Increased operational complexity
**Mitigation**:
- Comprehensive monitoring and alerting
- Automated deployment pipelines
- Documentation and runbooks
- Team training on microservices operations

## 9. Success Metrics and Monitoring

### 9.1 Migration Success Metrics
- **Service Extraction Progress**: % of monolith functionality extracted
- **API Response Times**: Service response time SLAs
- **System Availability**: 99.5% uptime target
- **Data Consistency**: Zero data loss during migration
- **Test Coverage**: >90% test coverage for service boundaries

### 9.2 Production Monitoring
```java
// Service health monitoring
@Component
public class ServiceHealthIndicator implements HealthIndicator {
    
    @Override
    public Health health() {
        // Check service dependencies
        boolean userServiceHealthy = checkUserService();
        boolean decisionServiceHealthy = checkDecisionService();
        boolean databaseHealthy = checkDatabase();
        
        if (userServiceHealthy && decisionServiceHealthy && databaseHealthy) {
            return Health.up()
                .withDetail("user-service", "UP")
                .withDetail("decision-service", "UP") 
                .withDetail("database", "UP")
                .build();
        } else {
            return Health.down()
                .withDetail("user-service", userServiceHealthy ? "UP" : "DOWN")
                .withDetail("decision-service", decisionServiceHealthy ? "UP" : "DOWN")
                .withDetail("database", databaseHealthy ? "UP" : "DOWN")
                .build();
        }
    }
}
```

### 9.3 Business Metrics Dashboard
- **Timesheet Processing Time**: Average time for approval workflow
- **System Usage**: Active users per service
- **Error Rates**: Service error rates and recovery time
- **Cost Optimization**: Infrastructure cost per service

## 10. Rollback Strategy

### 10.1 Service-Level Rollback
Each service extraction includes a rollback plan:

```java
// Feature flags for gradual rollout
@Component
public class ServiceRoutingConfig {
    
    @Value("${service.user.enabled:false}")
    private boolean userServiceEnabled;
    
    public UserManagementService getUserService() {
        if (userServiceEnabled) {
            return userServiceClient;  // Route to microservice
        } else {
            return userApplicationService;  // Route to monolith
        }
    }
}
```

### 10.2 Data Rollback Strategy
- **Database Snapshots**: Regular snapshots before migration steps
- **Data Synchronization**: Bi-directional sync during migration
- **Validation Queries**: Automated data integrity checks
- **Recovery Procedures**: Automated rollback scripts

## 11. Timeline and Resource Planning

### 11.1 Overall Timeline
```
2025 Q1: Phase 1 Completion (Service Boundaries)
2025 Q2: Phase 2 Implementation (Event-Driven Communication)  
2025 Q3-Q4: Phase 3 Execution (Service Extraction)
2026 Q1-Q2: Phase 4 Optimization (Full Microservices)
```

### 11.2 Resource Requirements
- **Development Team**: 3-4 developers for migration work
- **DevOps Engineer**: 1 dedicated engineer for infrastructure
- **QA Engineer**: 1 engineer for testing strategy and automation
- **Infrastructure**: Additional cloud resources for services and databases

### 11.3 Budget Estimation
- **Development Effort**: 18-24 months of development time
- **Infrastructure Costs**: 2-3x current costs during migration
- **Training and Tools**: Investment in monitoring and development tools
- **Risk Buffer**: 20% additional time/budget for unexpected issues

---

## Conclusion

The migration from monolith to microservices is a significant undertaking that will provide long-term benefits in terms of scalability, maintainability, and team autonomy. The phased approach with the Strangler Fig pattern minimizes risk while ensuring continuous value delivery.

The key success factors are:
1. **Well-defined service boundaries** (Phase 1 - nearly complete)
2. **Comprehensive testing strategy** at all levels
3. **Gradual migration** with rollback capabilities
4. **Strong monitoring and observability** infrastructure
5. **Team training and documentation**

**Next Immediate Actions:**
1. Complete CourseApplicationService implementation
2. Design TimesheetServicePort interface
3. Begin Phase 2 planning (Event-Driven Communication)
4. Set up monitoring and observability infrastructure

---

**Document Version**: v1.0  
**Creation Date**: 2025-08-06  
**Target Audience**: Development Team, DevOps, Management  
**Next Review**: Phase 1 completion  
**Maintainer**: Technical Lead
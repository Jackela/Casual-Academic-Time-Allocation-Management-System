# Database Schema Organization for Microservices Migration

## Overview

This document outlines the database schema organization strategy for preparing CATAMS for future microservices architecture. While we maintain a single database in the current monolith, we organize schemas by service boundaries to facilitate eventual data separation.

## Service Boundary Database Organization

### 1. User Management Service Schema

**Primary Tables:**
- `users` - Core user information and authentication
- `user_sessions` - User session management (future)
- `user_preferences` - User settings and preferences (future)

**Relationships:**
- Users are referenced by other services via `user_id` foreign keys
- In microservices: This will become a dedicated User Service database

**Access Patterns:**
- High read frequency for authentication and authorization
- User lookups by email and ID
- Role-based queries

**Future Microservice Considerations:**
- User data will be replicated in other services as needed
- Events will synchronize user changes across services
- User service will be the single source of truth for user data

### 2. Course Management Service Schema

**Primary Tables:**
- `courses` - Course definitions and metadata
- `course_budgets` - Budget tracking (future separate table)
- `course_enrollments` - Student enrollment data (future)
- `course_tutoring_assignments` - Tutor-course relationships (future)

**Relationships:**
- Courses reference `lecturer_id` from users table
- Referenced by timesheets via `course_id`

**Access Patterns:**
- Course lookups by code, lecturer, and semester
- Budget calculation and tracking queries
- Active course filtering

**Future Microservice Considerations:**
- Course service will maintain course catalog
- Budget information may be split to Finance service
- Course-user relationships will be event-driven

### 3. Timesheet Service Schema

**Primary Tables:**
- `timesheets` - Core timesheet data and workflow state
- `timesheet_approvals` - Approval history and workflow (future)
- `timesheet_revisions` - Version history (future)
- `timesheet_attachments` - File attachments (future)

**Relationships:**
- References `tutor_id` and `course_id`
- May reference approver IDs from users table

**Access Patterns:**
- Timesheet queries by tutor, course, date range, status
- Approval workflow queries
- Financial calculation queries

**Future Microservice Considerations:**
- Timesheet service will be the most complex microservice
- Will need to call User and Course services for validation
- Heavy event publishing for workflow coordination

### 4. Workflow/Decision Service Schema

**Primary Tables:**
- `workflow_rules` - Business rules configuration (future)
- `approval_workflows` - Workflow definitions (future)
- `decision_logs` - Audit trail of decisions (future)

**Relationships:**
- References various entities for decision context

**Access Patterns:**
- Rule evaluation queries
- Audit and compliance reporting

**Future Microservice Considerations:**
- Central business rules engine
- Stateless decision service
- Heavy integration with other services

## Current Schema Enhancement Strategy

### Phase 1: Logical Schema Separation

While maintaining physical database unity, we'll organize our approach:

```sql
-- User Management focused queries and indexes
CREATE INDEX idx_user_email_active ON users (email_value, is_active);
CREATE INDEX idx_user_role_active ON users (role, is_active);

-- Course Management focused queries and indexes  
CREATE INDEX idx_course_lecturer_semester ON courses (lecturer_id, semester);
CREATE INDEX idx_course_active_budget ON courses (is_active, budget_allocated);

-- Timesheet Service focused queries and indexes
CREATE INDEX idx_timesheet_tutor_status ON timesheets (tutor_id, status);
CREATE INDEX idx_timesheet_course_week ON timesheets (course_id, week_start_date);
CREATE INDEX idx_timesheet_status_deadline ON timesheets (status, approval_deadline);
```

### Phase 2: Data Access Patterns

**Service-Oriented Data Access:**
- Each service interface only accesses its designated tables
- Cross-service data access goes through service interfaces
- No direct database access across service boundaries

**Repository Pattern Enhancement:**
```java
// User Service repositories
@Repository
interface UserRepository extends JpaRepository<User, Long> {
    // User service specific queries only
}

// Course Service repositories  
@Repository
interface CourseRepository extends JpaRepository<Course, Long> {
    // Course service specific queries only
}

// Timesheet Service repositories
@Repository
interface TimesheetRepository extends JpaRepository<Timesheet, Long> {
    // Timesheet service specific queries only
}
```

### Phase 3: Transaction Boundaries

**Service Transaction Isolation:**
- Each service manages its own transactional boundaries
- Cross-service operations use eventual consistency via events
- Saga pattern for complex workflows

**Transaction Examples:**
```java
@Service
@Transactional
public class TimesheetServiceImpl {
    // All timesheet operations in single transaction
    // Publishes events for cross-service coordination
}
```

## Migration Strategy for Microservices

### Step 1: Service Interface Isolation ✅ COMPLETED
- Create service interfaces for each boundary
- Implement DTOs for service communication
- Establish event-driven communication

### Step 2: Database Access Isolation
- Restrict repository access to service boundaries
- Remove cross-service direct database access
- Implement service-to-service communication

### Step 3: Data Consistency Patterns
- Implement eventual consistency via events
- Create compensation patterns for failures
- Establish data replication strategies

### Step 4: Schema Physical Separation
- Extract schemas to separate databases
- Maintain referential integrity through application logic
- Implement distributed transaction patterns

## Data Consistency Strategies

### 1. Event Sourcing Preparation
```java
// Events capture all state changes
TimesheetCreatedEvent event = new TimesheetCreatedEvent(
    timesheetId, tutorId, courseId, weekStartDate, 
    hours, hourlyRate, description, userId, correlationId
);
eventPublisher.publish(event);
```

### 2. CQRS Pattern Readiness
```java
// Command side - handles writes
TimesheetCommand command = new CreateTimesheetCommand(data);
commandHandler.handle(command);

// Query side - optimized for reads  
TimesheetProjection projection = queryService.getTimesheet(id);
```

### 3. Distributed Data Management

**User Data Distribution:**
- User service maintains master user data
- Other services cache essential user information
- Events synchronize changes across services

**Course Data Distribution:**
- Course service maintains course catalog
- Timesheet service caches course validation data
- Budget tracking may be distributed to Finance service

**Timesheet Data:**
- Remains centralized in Timesheet service
- Publishes events for analytics and reporting
- Maintains audit trail for compliance

## Database Performance Considerations

### 1. Service-Specific Indexes
```sql
-- User Service optimizations
CREATE INDEX idx_users_authentication ON users (email_value, hashed_password, is_active);

-- Course Service optimizations  
CREATE INDEX idx_courses_capacity ON courses (lecturer_id, is_active, budget_allocated, budget_used);

-- Timesheet Service optimizations
CREATE INDEX idx_timesheets_workflow ON timesheets (status, current_approver_id, approval_deadline);
CREATE INDEX idx_timesheets_reporting ON timesheets (week_start_date, status, total_amount);
```

### 2. Query Optimization by Service

**User Service Queries:**
- Fast authentication lookups
- Role-based access queries
- User profile management

**Course Service Queries:**  
- Course catalog browsing
- Budget tracking and reporting
- Lecturer course management

**Timesheet Service Queries:**
- Timesheet CRUD operations
- Approval workflow processing
- Financial reporting and analytics

### 3. Connection Pool Strategy

**Current Monolith:**
- Single connection pool shared across all services
- Transaction isolation at application level

**Future Microservices:**
- Each service has its own database and connection pool
- Service-to-service communication via REST/messaging
- Distributed transaction coordination

## Monitoring and Observability

### 1. Service-Level Metrics
```java
// Track service boundary performance
@Timed("timesheet.service.create")
public TimesheetDto createTimesheet(...) {
    // Implementation
}

@Timed("user.service.authenticate")  
public Optional<UserDto> authenticate(...) {
    // Implementation
}
```

### 2. Cross-Service Tracing
```java
// Correlation ID propagation
@EventListener
public void handleTimesheetCreated(TimesheetCreatedEvent event) {
    String correlationId = event.getCorrelationId();
    // Use correlation ID for distributed tracing
}
```

### 3. Data Consistency Monitoring
- Monitor event delivery success rates
- Track eventual consistency convergence times
- Alert on cross-service data drift

## Migration Timeline

### Current State: Microservices-Ready Monolith ✅
- Service interfaces defined
- DTOs created for service communication
- Event-driven patterns established
- Database access organized by service boundaries

### Phase 1: Service Isolation (3-6 months)
- Implement strict service boundary enforcement
- Remove direct cross-service database access
- Establish service communication protocols

### Phase 2: Data Preparation (6-12 months)
- Implement eventual consistency patterns
- Create data replication mechanisms
- Establish monitoring and observability

### Phase 3: Physical Separation (12-18 months)
- Extract services to separate deployments
- Migrate to separate databases
- Implement distributed system patterns

## Conclusion

This database organization strategy prepares CATAMS for microservices while maintaining current functionality. The key principle is organizing by service boundaries even within a monolithic database, establishing patterns that will naturally evolve into microservices architecture.

The strategy prioritizes:
1. **Service Boundary Clarity** - Clear separation of concerns
2. **Data Access Patterns** - Service-oriented data access
3. **Event-Driven Consistency** - Prepare for distributed data
4. **Performance Optimization** - Service-specific optimizations
5. **Monitoring Readiness** - Observability across service boundaries

This approach ensures that the eventual microservices migration will be an evolutionary step rather than a revolutionary rewrite.
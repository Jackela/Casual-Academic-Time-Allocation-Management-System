# AI-Friendly Javadoc Standards & Business Contract Annotations

**Purpose**: Comprehensive standards for AI-friendly documentation with business contract specifications

---

## Core Documentation Standards

### 1. Complete Javadoc Structure

```java
/**
 * [Clear, concise description of class/method purpose and business context]
 * 
 * <p>[Extended description with business rules, usage patterns, and important notes]
 * 
 * <p><strong>Business Context:</strong> [Specific business domain context and rules]
 * 
 * <p><strong>Thread Safety:</strong> [Thread safety guarantees or concerns]
 * 
 * <p><strong>Performance:</strong> [Performance characteristics and implications]
 * 
 * @precondition [Business state requirements before method execution]
 * @postcondition [Business state guarantees after successful execution]  
 * @invariant [Business rules that must always hold true]
 * 
 * @param paramName [Parameter purpose, constraints, validation rules, and expected format]
 * @return [Return value meaning, possible states, and business significance]
 * @throws ExceptionType [Specific conditions causing exception and business impact]
 * 
 * @see [Related classes, methods, or documentation]
 * @since [Version when added]
 * @author [Original author for context]
 */
```

### 2. Business Contract Annotations

#### @precondition
Defines business state requirements before method execution:
```java
/**
 * @precondition User must be authenticated with role LECTURER or ADMIN
 * @precondition Course must exist and be in ACTIVE status
 * @precondition Target tutor must have TUTOR role and be assigned to course
 */
```

#### @postcondition  
Defines business state guarantees after successful execution:
```java
/**
 * @postcondition Timesheet status will be DRAFT if successful
 * @postcondition Course tutor count will be incremented by 1
 * @postcondition Audit log entry will be created for timesheet creation
 */
```

#### @invariant
Defines business rules that must always hold:
```java
/**
 * @invariant Total weekly hours must not exceed ValidationSSOT.MAX_WEEKLY_HOURS (40.0)
 * @invariant Timesheet end date must be exactly 6 days after start date
 * @invariant Only one timesheet per tutor-course-week combination allowed
 */
```

### 3. Parameter Documentation Standards

```java
/**
 * @param creator The user creating the timesheet. Must be non-null with role LECTURER or ADMIN.
 *                Authentication token must be valid and user must be active.
 * @param tutor The target tutor for timesheet creation. Must be non-null with role TUTOR,
 *              active status, and assigned to the specified course.
 * @param course The course context for timesheet. Must be non-null, active, and the creator
 *               must have lecturer authority over this course.
 * @param startDate Week start date in Monday format (validates against Monday constraint).
 *                  Must not be null and must be a valid Monday date.
 * @param endDate Week end date exactly 6 days after startDate (Sunday).
 *               Must not be null and must equal startDate.plusDays(6).
 */
```

### 4. Return Value Documentation

```java
/**
 * @return Newly created Timesheet entity in DRAFT status with:
 *         - Unique ID assigned by database
 *         - All provided parameters set as properties
 *         - Created/updated timestamps initialized
 *         - Default values applied for optional fields
 *         - Business validation rules enforced
 */
```

### 5. Exception Documentation

```java
/**
 * @throws SecurityException When user lacks authorization for the operation.
 *                          Specific scenarios: user role insufficient, no course authority,
 *                          or target tutor not accessible to creator.
 * @throws IllegalArgumentException When business validation fails.
 *                                Scenarios: invalid date format, constraint violations,
 *                                or duplicate timesheet detection.
 * @throws EntityNotFoundException When referenced entities don't exist.
 *                               Scenarios: course not found, user not found,
 *                               or tutor not assigned to course.
 */
```

---

## AI-Friendly Documentation Patterns

### 1. Semantic Method Names with Context

```java
/**
 * Validates whether a user can create a timesheet for a specific tutor and course combination.
 * 
 * <p>This method implements the core authorization logic for timesheet creation, enforcing
 * role-based access control (RBAC) with hierarchical permissions and resource-based validation.
 * 
 * <p><strong>Authorization Matrix:</strong>
 * <ul>
 * <li>ADMIN: Can create timesheets for any tutor in any course</li>
 * <li>LECTURER: Can create timesheets only for tutors in courses they teach</li>
 * <li>TUTOR: Cannot create timesheets (read-only access to their own)</li>
 * </ul>
 * 
 * @precondition All parameters must be non-null and represent valid, active entities
 * @precondition Creator must be authenticated with valid session
 * @postcondition No state changes occur (read-only authorization check)
 * @invariant Role hierarchy ADMIN > LECTURER > TUTOR must be respected
 */
```

### 2. Business Rule Integration

```java
/**
 * Calculates total billable hours for a tutor in a specific course within date range.
 * 
 * <p><strong>Business Rules Applied:</strong>
 * <ul>
 * <li>Only FINAL_APPROVED timesheets count toward billable hours</li>
 * <li>Hours are aggregated using BigDecimal for financial precision</li>
 * <li>Maximum weekly hours constraint (40.0) validation included</li>
 * <li>Overlapping timesheet detection prevents double-billing</li>
 * </ul>
 * 
 * @precondition Date range must be valid (startDate <= endDate)
 * @precondition Tutor must be assigned to specified course during date range
 * @postcondition Returned hours represent accurate billable amount for payroll
 * @invariant Calculated hours will never exceed maximum allowed per ValidationSSOT
 */
```

### 3. Performance and Scalability Notes

```java
/**
 * Retrieves paginated list of timesheets with optional filtering and sorting.
 * 
 * <p><strong>Performance Characteristics:</strong>
 * <ul>
 * <li>Database query optimized with proper indexing on frequently filtered columns</li>
 * <li>Pagination prevents memory issues with large datasets (>10,000 records)</li>
 * <li>Authorization filtering applied at database level for performance</li>
 * <li>Result caching available for repeated queries within session</li>
 * </ul>
 * 
 * <p><strong>Scalability Notes:</strong>
 * Default page size of 20 recommended. Maximum page size of 100 enforced to prevent
 * memory exhaustion and ensure reasonable response times (<2 seconds).
 * 
 * @precondition Page and size parameters must be positive integers
 * @postcondition Results are ordered consistently for pagination stability
 * @invariant Total count reflects only records user has permission to view
 */
```

### 4. Cross-Reference Documentation

```java
/**
 * Submits timesheet for approval workflow initiation.
 * 
 * <p>Integrates with the approval state machine to transition timesheet from DRAFT
 * to PENDING_TUTOR_REVIEW status, initiating the dual approval workflow.
 * 
 * <p><strong>Related Components:</strong>
 * <ul>
 * <li>{@link ApprovalStateMachine#transition} - Handles state validation</li>
 * <li>{@link TimesheetValidationService#validateForSubmission} - Pre-submission checks</li>
 * <li>{@link NotificationService#sendApprovalNotification} - Approval notifications</li>
 * </ul>
 * 
 * @see ApprovalStateMachine for complete workflow documentation
 * @see ValidationSSOT for business rule constants
 * 
 * @precondition Timesheet must be in DRAFT or MODIFICATION_REQUESTED status
 * @postcondition Timesheet status becomes PENDING_TUTOR_REVIEW
 * @postcondition Approval notification sent to designated approvers
 * @invariant Timesheet data integrity maintained throughout state transition
 */
```

---

## Implementation Priority Matrix

### Priority 1: Core Business Logic
1. **TimesheetPermissionPolicy** interface and implementation
2. **TimesheetApplicationService** main orchestration methods
3. **Timesheet** entity business methods and validation
4. **ApprovalStateMachine** workflow transition logic
5. **TimesheetDomainService** domain calculations

### Priority 2: API and Controllers  
1. **TimesheetController** REST endpoint documentation
2. **ApprovalController** workflow endpoint specifications
3. **UserController** authentication and user management
4. **DashboardController** analytics and reporting endpoints

### Priority 3: Infrastructure
1. **Repository** interfaces with query documentation
2. **Configuration** classes with property explanations
3. **Exception** classes with error context
4. **Utility** classes with algorithm explanations

---

## Quality Validation Checklist

### ✅ Documentation Completeness
- [ ] All public methods have complete Javadoc
- [ ] All parameters documented with constraints
- [ ] All return values explained with business context
- [ ] All exceptions documented with triggering conditions

### ✅ Business Contract Annotations
- [ ] @precondition specified for state requirements
- [ ] @postcondition defined for result guarantees  
- [ ] @invariant documented for business rules
- [ ] Contract consistency verified across related methods

### ✅ AI-Friendly Elements
- [ ] Semantic method descriptions with business context
- [ ] Cross-references between related components
- [ ] Performance characteristics documented
- [ ] Usage examples provided for complex methods

### ✅ Integration Documentation
- [ ] Service dependencies clearly documented
- [ ] Workflow integration points explained
- [ ] Error handling patterns described
- [ ] Configuration requirements specified

---

**Implementation Standard**: Every public method in core business logic classes must include all standard Javadoc elements plus business contract annotations where applicable. This ensures maximum AI comprehension and automated code analysis capabilities.
package com.usyd.catams.policy;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;

import java.time.LocalDate;

/**
 * Strategic authorization policy interface for comprehensive timesheet operation permissions.
 * 
 * <p>This interface abstracts all authorization logic from the ApplicationService layer,
 * implementing the Strategy Pattern to enable flexible permission strategies while maintaining
 * clean separation between business orchestration and authorization concerns.
 * 
 * <p><strong>Business Context:</strong> Implements role-based access control (RBAC) with 
 * hierarchical permissions (ADMIN > LECTURER > TUTOR), ownership-based validation, 
 * resource-based authority checks, and status-aware permissions aligned with the approval workflow.
 * 
 * <p><strong>Authorization Matrix:</strong>
 * <ul>
 * <li><strong>ADMIN</strong>: Full access to all timesheet operations across all courses and users</li>
 * <li><strong>LECTURER</strong>: Can manage timesheets for courses they teach, including creation and approval</li>
 * <li><strong>TUTOR</strong>: Can manage (view/create/edit) their own timesheets within permitted statuses</li>
 * </ul>
 * 
 * <p><strong>Design Patterns Implemented:</strong>
 * <ul>
 * <li><strong>Strategy Pattern</strong>: Enables different authorization implementations (default, LDAP, OAuth)</li>
 * <li><strong>Dependency Inversion Principle</strong>: ApplicationService depends on this abstraction</li>
 * <li><strong>Single Responsibility Principle</strong>: Pure authorization logic, no business orchestration</li>
 * </ul>
 * 
 * <p><strong>Thread Safety:</strong> All implementations must be stateless and thread-safe for concurrent access.
 * 
 * <p><strong>Performance:</strong> Authorization checks should complete in <1ms. Implementations may cache
 * course authority relationships for performance optimization.
 * 
 * @invariant All permission methods must handle null parameters gracefully and return false for invalid inputs
 * @invariant Role hierarchy ADMIN > LECTURER > TUTOR must be consistently enforced across all methods
 * @invariant Status-based permissions must align with ApprovalStateMachine workflow rules
 * 
 * @see DefaultTimesheetPermissionPolicy for the default role-based implementation
 * @see ApprovalStateMachine for workflow status rules
 * @see TimesheetApplicationService for usage patterns
 * 
 * @since 2.0
 * @author Architecture Team
 */
public interface TimesheetPermissionPolicy {
    
    // =========================
    // Creation Permissions
    // =========================
    
    /**
     * Validates whether a user has general timesheet creation privileges based on role.
     * 
     * <p>This method performs role-based validation for timesheet creation capability
     * without considering specific business context (tutor/course relationships).
     * Used primarily for UI permission checks and menu display authorization.
     * 
     * <p><strong>Business Rules:</strong>
     * <ul>
     * <li>Only LECTURER and ADMIN roles can create timesheets</li>
     * <li>TUTOR role can create timesheets for themselves and manage self-owned drafts</li>
     * <li>User must be active and authenticated</li>
     * </ul>
     * 
     * @precondition User must be non-null with valid authentication session
     * @postcondition No state changes occur (read-only permission check)
     * @invariant Role hierarchy ADMIN > LECTURER > TUTOR must be respected
     * 
     * @param creator The user requesting timesheet creation capability validation.
     *                Must be non-null with active status and valid role assignment.
     * @return true if user role permits timesheet creation (LECTURER or ADMIN),
     *         false for TUTOR role or invalid/null user
     * 
     * @see #canCreateTimesheetFor(User, User, Course) for context-specific creation validation
     */
    boolean canCreateTimesheet(User creator);
    
    /**
     * Validates comprehensive authorization for creating a timesheet for a specific tutor-course combination.
     * 
     * <p>This method enforces business rules for timesheet creation including role-based access control,
     * course authority validation, and tutor eligibility verification. This is the primary authorization
     * method used during actual timesheet creation operations.
     * 
     * <p><strong>Authorization Matrix:</strong>
     * <ul>
     * <li><strong>ADMIN</strong>: Can create timesheets for any tutor in any course</li>
     * <li><strong>LECTURER</strong>: Can create timesheets only for tutors in courses they teach</li>
     * <li><strong>TUTOR</strong>: Can create timesheets for themselves</li>
     * </ul>
     * 
     * <p><strong>Business Validation Rules:</strong>
     * <ul>
     * <li>Target tutor must have TUTOR role and be active</li>
     * <li>Course must be active and accepting timesheets</li>
     * <li>Tutor must be assigned to the specified course</li>
     * <li>Creator must have lecturer authority over the course (if LECTURER role)</li>
     * </ul>
     * 
     * @precondition All parameters must be non-null and represent valid, persisted entities
     * @precondition Creator must be authenticated with valid session
     * @precondition Target tutor must have TUTOR role and be assigned to the course
     * @precondition Course must be in ACTIVE status and accept new timesheets
     * @postcondition No state changes occur (read-only authorization check)
     * @invariant Role hierarchy and course authority rules must be consistently applied
     * 
     * @param creator The user requesting timesheet creation. Must be non-null with role LECTURER or ADMIN,
     *                active status, and valid authentication session.
     * @param tutor The target tutor for the timesheet. Must be non-null with role TUTOR,
     *              active status, and assignment to the specified course.
     * @param course The course context for timesheet creation. Must be non-null, active,
     *               and the creator must have appropriate authority (lecturer assignment for LECTURER role).
     * @return true if creation is authorized based on role hierarchy and business rules,
     *         false if any authorization check fails or parameters are invalid
     * 
     * @see TimesheetDomainService#isTutorAssignedToCourse for tutor-course relationship validation
     * @see CourseRepository#findById for course existence and status validation
     */
    boolean canCreateTimesheetFor(User creator, User tutor, Course course);
    
    // =========================
    // Read Permissions
    // =========================
    
    /**
     * Validates authorization for viewing a specific timesheet with comprehensive business rule enforcement.
     * 
     * <p>This method implements role-based access control with ownership validation and course authority
     * checks to determine timesheet viewing permissions. Used for individual timesheet access in
     * detail views, edit forms, and approval workflows.
     * 
     * <p><strong>Access Control Matrix:</strong>
     * <ul>
     * <li><strong>ADMIN</strong>: Can view all timesheets regardless of course or ownership</li>
     * <li><strong>LECTURER</strong>: Can view timesheets only for courses they teach</li>
     * <li><strong>TUTOR</strong>: Can view only their own timesheets</li>
     * </ul>
     * 
     * <p><strong>Business Rules Applied:</strong>
     * <ul>
     * <li>Ownership validation: TUTOR users limited to their own timesheets</li>
     * <li>Course authority: LECTURER users limited to courses they teach</li>
     * <li>Status independence: All timesheet statuses viewable if other rules pass</li>
     * <li>Active user requirement: Inactive users cannot view timesheets</li>
     * </ul>
     * 
     * <p><strong>Performance Notes:</strong>
     * Authorization check completes in <1ms. Course authority validation may trigger
     * database lookup if not cached.
     * 
     * @precondition All parameters must be non-null and represent valid entities
     * @precondition Requester must be authenticated with active status
     * @precondition Timesheet must be persisted with valid ID
     * @precondition Course must match the timesheet's course association
     * @postcondition No state changes occur (read-only authorization check)
     * @invariant Ownership and course authority rules must be consistently enforced
     * @invariant Role hierarchy ADMIN > LECTURER > TUTOR must be respected
     * 
     * @param requester The user requesting timesheet access. Must be non-null, active,
     *                  and authenticated with valid session.
     * @param timesheet The timesheet entity to access. Must be non-null, persisted,
     *                  and associated with the provided course.
     * @param course The course context for the timesheet. Must be non-null and match
     *               the timesheet's course relationship.
     * @return true if viewing is authorized based on role, ownership, and course authority;
     *         false if any authorization rule fails or parameters are invalid
     * 
     * @see TimesheetDomainService#isTutorOwnerOfTimesheet for ownership validation
     * @see TimesheetDomainService#hasLecturerAuthorityOverCourse for course authority checks
     */
    boolean canViewTimesheet(User requester, Timesheet timesheet, Course course);
    
    /**
     * Check if user can view timesheets by filters.
     * @param requester The user requesting access
     * @param tutorId Optional tutor ID filter (null for all)
     * @param courseId Optional course ID filter (null for all)
     * @param status Optional status filter (null for all)
     * @return true if filtered view is authorized
     */
    boolean canViewTimesheetsByFilters(User requester, Long tutorId, Long courseId, ApprovalStatus status);
    
    /**
     * Check if user can view timesheet data by date range for a specific tutor.
     * @param requester The user requesting access
     * @param tutorId The tutor ID for the query
     * @param startDate Start date of range
     * @param endDate End date of range
     * @return true if date range query is authorized
     */
    boolean canViewTimesheetsByDateRange(User requester, Long tutorId, LocalDate startDate, LocalDate endDate);
    
    /**
     * Check if user can view total hours for tutor/course combination.
     * @param requester The user requesting access
     * @param tutorId The tutor ID for the query
     * @param courseId The course ID for the query
     * @return true if total hours query is authorized
     */
    boolean canViewTotalHours(User requester, Long tutorId, Long courseId);
    
    /**
     * Check if user can view budget information for a course.
     * @param requester The user requesting access
     * @param courseId The course ID for budget query
     * @return true if budget access is authorized
     */
    boolean canViewCourseBudget(User requester, Long courseId);
    
    // =========================
    // Modification Permissions  
    // =========================
    
    /**
     * Check if user can modify timesheet (edit or delete).
     * @param requester The user requesting modification
     * @param timesheet The timesheet to modify
     * @param course The course associated with the timesheet
     * @return true if modification is authorized
     */
    boolean canModifyTimesheet(User requester, Timesheet timesheet, Course course);
    
    /**
     * Validates authorization for editing a timesheet with status-aware permission enforcement.
     * 
     * <p>This method combines role-based access control with approval workflow status validation
     * to determine timesheet editing permissions. Editing is only permitted in specific workflow
     * states that maintain data integrity and approval process compliance.
     * 
     * <p><strong>Status-Based Editing Rules:</strong>
     * <ul>
     * <li><strong>DRAFT</strong>: Editable by owner (TUTOR) or course authority (LECTURER/ADMIN)</li>
     * <li><strong>MODIFICATION_REQUESTED</strong>: Editable by owner to address requested changes</li>
     * <li><strong>REJECTED</strong>: Editable by owner to address rejection reasons and resubmit</li>
     * <li><strong>PENDING_TUTOR_CONFIRMATION</strong>: Not editable (awaiting tutor confirmation)</li>
     * <li><strong>TUTOR_CONFIRMED</strong>: Not editable (awaiting lecturer confirmation)</li>
     * <li><strong>LECTURER_CONFIRMED</strong>: Not editable (awaiting final confirmation)</li>
     * <li><strong>FINAL_CONFIRMED</strong>: Not editable (final confirmation locks timesheet)</li>
     * </ul>
     * 
     * <p><strong>Role-Based Authorization:</strong>
     * <ul>
     * <li><strong>ADMIN</strong>: Can edit timesheets in editable statuses regardless of ownership</li>
     * <li><strong>LECTURER</strong>: Can edit timesheets for their courses in editable statuses</li>
     * <li><strong>TUTOR</strong>: Can edit only their own timesheets in editable statuses</li>
     * </ul>
     * 
     * <p><strong>Business Integrity Rules:</strong>
     * <ul>
     * <li>Editing approved timesheets is prohibited to maintain audit trail</li>
     * <li>Rejected timesheets cannot be edited (new creation required)</li>
     * <li>Under-review timesheets are locked to prevent approval process interference</li>
     * </ul>
     * 
     * @precondition All parameters must be non-null and represent valid entities
     * @precondition Requester must be authenticated and active
     * @precondition Timesheet must be in a potentially editable status (DRAFT or MODIFICATION_REQUESTED)
     * @precondition User must pass basic modification permission check via canModifyTimesheet()
     * @postcondition No state changes occur (read-only authorization check)
     * @invariant Status-based editing rules must align with ApprovalStateMachine workflow
     * @invariant Role hierarchy and ownership rules must be consistently enforced
     * 
     * @param requester The user requesting timesheet edit permission. Must be non-null, active,
     *                  and authenticated with valid session.
     * @param timesheet The timesheet to edit. Must be non-null, persisted, and in a status
     *                  that potentially allows editing (DRAFT or MODIFICATION_REQUESTED).
     * @param course The course associated with the timesheet. Must be non-null and match
     *               the timesheet's course relationship.
     * @return true if editing is authorized based on role, ownership, and current workflow status;
     *         false if status prohibits editing or authorization rules fail
     * 
     * @see #canModifyTimesheet(User, Timesheet, Course) for basic modification permission validation
     * @see TimesheetDomainService#canRoleEditTimesheetWithStatus for status-specific editing rules
     * @see ApprovalStateMachine#isEditable for workflow status validation
     */
    boolean canEditTimesheet(User requester, Timesheet timesheet, Course course);
    
    /**
     * Check if user can delete timesheet based on current status.
     * @param requester The user requesting deletion
     * @param timesheet The timesheet to delete
     * @param course The course associated with the timesheet
     * @return true if deletion is authorized
     */
    boolean canDeleteTimesheet(User requester, Timesheet timesheet, Course course);
    
    // =========================
    // Approval Queue Permissions
    // =========================
    
    /**
     * Check if user can access pending approval timesheet queue.
     * @param requester The user requesting access
     * @return true if pending approval access is authorized
     */
    boolean canViewPendingApprovalQueue(User requester);
    
    /**
     * Check if user can access lecturer final approval queue.
     * @param requester The user requesting access
     * @return true if lecturer final approval queue access is authorized
     */
    boolean canViewLecturerFinalApprovalQueue(User requester);
    
    /**
     * Check if user can view timesheets by tutor (for tutor-specific queries).
     * @param requester The user requesting access
     * @param tutorId The tutor ID for the query
     * @return true if tutor timesheet query is authorized
     */
    boolean canViewTimesheetsByTutor(User requester, Long tutorId);
}

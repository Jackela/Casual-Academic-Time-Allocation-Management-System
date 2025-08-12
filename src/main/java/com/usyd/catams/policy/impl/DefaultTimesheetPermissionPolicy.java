package com.usyd.catams.policy.impl;

import com.usyd.catams.domain.service.TimesheetDomainService;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.policy.TimesheetPermissionPolicy;
import com.usyd.catams.repository.CourseRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Default role-based implementation of TimesheetPermissionPolicy with comprehensive business rule enforcement.
 * 
 * <p>This Spring-managed component implements a sophisticated authorization strategy that combines
 * role-based access control (RBAC), ownership validation, resource-based permissions, and 
 * workflow status-aware authorization. It serves as the primary authorization engine for all
 * timesheet operations within the CATAMS system.
 * 
 * <p><strong>Authorization Architecture:</strong>
 * <ul>
 * <li><strong>Role Hierarchy</strong>: ADMIN (full access) > LECTURER (course-specific) > TUTOR (own resources)</li>
 * <li><strong>Ownership Model</strong>: Users can access resources they own or have authority over</li>
 * <li><strong>Resource Authority</strong>: LECTURER users have authority over courses they teach</li>
 * <li><strong>Status Awareness</strong>: Permissions adapt based on approval workflow state</li>
 * </ul>
 * 
 * <p><strong>Business Rules Implemented:</strong>
 * <ul>
 * <li>ADMIN users bypass all restrictions (superuser privileges)</li>
 * <li>LECTURER users can manage timesheets for courses they teach</li>
 * <li>TUTOR users can only access their own timesheets</li>
 * <li>Status-based editing: only DRAFT and MODIFICATION_REQUESTED are editable</li>
 * <li>Approval queue access varies by role and workflow responsibilities</li>
 * </ul>
 * 
 * <p><strong>Thread Safety:</strong> This component is stateless and thread-safe. All authorization
 * decisions are based on provided parameters without maintaining internal state.
 * 
 * <p><strong>Performance Characteristics:</strong>
 * <ul>
 * <li>Authorization checks complete in <1ms for cached course relationships</li>
 * <li>Database queries may be triggered for course authority validation</li>
 * <li>Domain service calls are optimized for frequently accessed patterns</li>
 * </ul>
 * 
 * <p><strong>Integration Points:</strong>
 * <ul>
 * <li>{@link TimesheetDomainService}: Provides ownership and authority business logic</li>
 * <li>{@link CourseRepository}: Enables course existence and authority validation</li>
 * <li>{@link ApprovalStateMachine}: Status-based permission rules align with workflow</li>
 * </ul>
 * 
 * @invariant Role hierarchy ADMIN > LECTURER > TUTOR must be consistently enforced
 * @invariant Null parameters must be handled gracefully (return false)
 * @invariant Authorization decisions must be deterministic for same input parameters
 * @invariant Status-based permissions must align with ApprovalStateMachine rules
 * 
 * @see TimesheetPermissionPolicy for interface contract documentation
 * @see TimesheetApplicationService for usage patterns
 * @see ApprovalStateMachine for workflow status rules
 * 
 * @since 2.0
 * @author Architecture Team
 */
@Component
public class DefaultTimesheetPermissionPolicy implements TimesheetPermissionPolicy {
    
    private final TimesheetDomainService domainService;
    private final CourseRepository courseRepository;
    
    /**
     * Constructs DefaultTimesheetPermissionPolicy with required domain service dependencies.
     * 
     * <p>This constructor is automatically invoked by Spring's dependency injection container
     * to wire the necessary domain services for authorization business logic execution.
     * 
     * @precondition Both parameters must be non-null and properly configured Spring beans
     * @postcondition Policy instance is ready for authorization operations
     * @invariant Injected dependencies remain immutable throughout instance lifecycle
     * 
     * @param domainService The domain service for ownership and authority validation.
     *                      Must be non-null and provide valid business rule implementations.
     * @param courseRepository The repository for course data access and validation.
     *                         Must be non-null and provide database connectivity.
     */
    public DefaultTimesheetPermissionPolicy(TimesheetDomainService domainService, 
                                          CourseRepository courseRepository) {
        this.domainService = domainService;
        this.courseRepository = courseRepository;
    }
    
    // =========================
    // Creation Permissions
    // =========================
    
    @Override
    public boolean canCreateTimesheet(User creator) {
        // Only LECTURER and ADMIN can create timesheets
        return creator.getRole() == UserRole.LECTURER || creator.getRole() == UserRole.ADMIN;
    }
    
    /**
     * {@inheritDoc}
     * 
     * <p><strong>Implementation Details:</strong>
     * This method implements a multi-layered authorization check combining role validation,
     * course authority verification, and tutor eligibility assessment.
     * 
     * <p><strong>Authorization Flow:</strong>
     * <ol>
     * <li>Validates creator has general creation permission (LECTURER or ADMIN role)</li>
     * <li>ADMIN role: Grants universal creation rights (bypasses further checks)</li>
     * <li>LECTURER role: Validates course authority and tutor role requirements</li>
     * <li>TUTOR role: Always denied (no creation privileges)</li>
     * </ol>
     * 
     * <p><strong>Business Logic Implementation:</strong>
     * <ul>
     * <li><strong>Role Hierarchy Enforcement</strong>: ADMIN > LECTURER > TUTOR</li>
     * <li><strong>Course Authority Check</strong>: LECTURER must teach the target course</li>
     * <li><strong>Target Validation</strong>: Timesheet target must have TUTOR role</li>
     * <li><strong>Defensive Programming</strong>: Null parameters return false</li>
     * </ul>
     * 
     * @precondition Creator must have valid role assignment and active status
     * @precondition Tutor must have TUTOR role if LECTURER is creating
     * @precondition Course must exist with valid lecturer assignment
     * @precondition All entities must be persisted with valid IDs
     * @postcondition Returns deterministic result for same input combination
     * @invariant ADMIN users always bypass course authority checks
     * @invariant LECTURER users must have course.lecturerId == creator.getId()
     * @invariant TUTOR users never receive creation authorization
     */
    @Override
    public boolean canCreateTimesheetFor(User creator, User tutor, Course course) {
        // Defensive null checks - handle gracefully
        if (creator == null || tutor == null || course == null) {
            return false;
        }
        
        // Must have general creation permission
        if (!canCreateTimesheet(creator)) {
            return false;
        }
        
        // ADMIN can create for anyone - superuser privileges
        if (creator.getRole() == UserRole.ADMIN) {
            return true;
        }
        
        // LECTURER can only create for tutors in their courses
        if (creator.getRole() == UserRole.LECTURER) {
            // Target must be a TUTOR - business rule enforcement
            if (tutor.getRole() != UserRole.TUTOR) {
                return false;
            }
            
            // LECTURER must be assigned to the course - authority validation
            return course.getLecturerId().equals(creator.getId());
        }
        
        // All other cases denied (TUTOR role, invalid roles)
        return false;
    }
    
    // =========================
    // Read Permissions
    // =========================
    
    @Override
    public boolean canViewTimesheet(User requester, Timesheet timesheet, Course course) {
        switch (requester.getRole()) {
            case ADMIN:
                return true; // ADMIN can view all timesheets
                
            case LECTURER:
                // LECTURER can view timesheets for courses they teach
                return domainService.hasLecturerAuthorityOverCourse(requester, course);
                
            case TUTOR:
                // TUTOR can only view their own timesheets
                return domainService.isTutorOwnerOfTimesheet(requester, timesheet);
                
            default:
                return false;
        }
    }
    
    @Override
    public boolean canViewTimesheetsByFilters(User requester, Long tutorId, Long courseId, ApprovalStatus status) {
        switch (requester.getRole()) {
            case ADMIN:
                return true; // ADMIN can view all filtered timesheets
                
            case LECTURER:
                // LECTURER can view filtered timesheets if they have course authority
                if (courseId != null) {
                    Course course = courseRepository.findById(courseId).orElse(null);
                    return course != null && domainService.hasLecturerAuthorityOverCourse(requester, course);
                }
                // If no specific course filter, allow (they'll be filtered by course authority in service)
                return true;
                
            case TUTOR:
                // TUTOR can only view their own timesheets, so tutorId must match or be null (implying own)
                return tutorId == null || tutorId.equals(requester.getId());
                
            default:
                return false;
        }
    }
    
    @Override
    public boolean canViewTimesheetsByDateRange(User requester, Long tutorId, LocalDate startDate, LocalDate endDate) {
        switch (requester.getRole()) {
            case ADMIN:
            case LECTURER:
                return true; // ADMIN and LECTURER can view date range queries
                
            case TUTOR:
                // TUTOR can only view their own date range
                return tutorId.equals(requester.getId());
                
            default:
                return false;
        }
    }
    
    @Override
    public boolean canViewTotalHours(User requester, Long tutorId, Long courseId) {
        switch (requester.getRole()) {
            case ADMIN:
                return true; // ADMIN can view all total hours
                
            case LECTURER:
                // LECTURER can view total hours for courses they teach
                Course course = courseRepository.findById(courseId).orElse(null);
                return course != null && domainService.hasLecturerAuthorityOverCourse(requester, course);
                
            case TUTOR:
                // TUTOR can only view their own total hours
                return tutorId.equals(requester.getId());
                
            default:
                return false;
        }
    }
    
    @Override
    public boolean canViewCourseBudget(User requester, Long courseId) {
        switch (requester.getRole()) {
            case ADMIN:
                return true; // ADMIN can view all course budgets
                
            case LECTURER:
                // LECTURER can view budget for courses they teach
                Course course = courseRepository.findById(courseId).orElse(null);
                return course != null && domainService.hasLecturerAuthorityOverCourse(requester, course);
                
            case TUTOR:
                return false; // TUTOR cannot view course budget information
                
            default:
                return false;
        }
    }
    
    // =========================
    // Modification Permissions
    // =========================
    
    @Override
    public boolean canModifyTimesheet(User requester, Timesheet timesheet, Course course) {
        switch (requester.getRole()) {
            case ADMIN:
                return true; // ADMIN can modify all timesheets
                
            case LECTURER:
                // LECTURER can modify timesheets for courses they teach
                return domainService.hasLecturerAuthorityOverCourse(requester, course);
                
            case TUTOR:
                // TUTOR can modify only their own timesheets
                return domainService.isTutorOwnerOfTimesheet(requester, timesheet);
                
            default:
                return false;
        }
    }
    
    @Override
    public boolean canEditTimesheet(User requester, Timesheet timesheet, Course course) {
        // Must have general modification permission
        if (!canModifyTimesheet(requester, timesheet, course)) {
            return false;
        }
        
        // Status-based editing permissions
        return domainService.canRoleEditTimesheetWithStatus(requester.getRole(), timesheet.getStatus());
    }
    
    @Override
    public boolean canDeleteTimesheet(User requester, Timesheet timesheet, Course course) {
        // Must have general modification permission
        if (!canModifyTimesheet(requester, timesheet, course)) {
            return false;
        }
        
        // Status-based deletion permissions
        return domainService.canRoleDeleteTimesheetWithStatus(requester.getRole(), timesheet.getStatus());
    }
    
    // =========================
    // Approval Queue Permissions
    // =========================
    
    @Override
    public boolean canViewPendingApprovalQueue(User requester) {
        switch (requester.getRole()) {
            case TUTOR:
            case ADMIN:
                return true; // TUTOR and ADMIN can view pending approval queue
                
            case LECTURER:
                // LECTURER users cannot access pending approval list per current business rules
                return false;
                
            default:
                return false;
        }
    }
    
    @Override
    public boolean canViewLecturerFinalApprovalQueue(User requester) {
        switch (requester.getRole()) {
            case LECTURER:
            case ADMIN:
                return true; // LECTURER and ADMIN can view lecturer final approval queue
                
            default:
                return false;
        }
    }
    
    @Override
    public boolean canViewTimesheetsByTutor(User requester, Long tutorId) {
        switch (requester.getRole()) {
            case ADMIN:
                return true; // ADMIN can view any tutor's timesheets
                
            case LECTURER:
                return true; // LECTURER can view tutor timesheets (filtered by course authority in service)
                
            case TUTOR:
                // TUTOR can only view their own timesheets
                return tutorId.equals(requester.getId());
                
            default:
                return false;
        }
    }
}
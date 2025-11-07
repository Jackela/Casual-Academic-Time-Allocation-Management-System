package com.usyd.catams.domain.service;

import com.usyd.catams.domain.rules.WorkflowRulesRegistry;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ApprovalDomainService {

    /**
     * Determines if a user role can perform a specific approval action (business rule).
     * Delegates to WorkflowRulesRegistry as the single source of truth.
     */
    public boolean canRolePerformAction(UserRole role, ApprovalAction action) {
        // Check if any rule exists for this role+action combination across all statuses
        return WorkflowRulesRegistry.getAllRules().keySet().stream()
            .anyMatch(key -> key.role() == role && key.action() == action);
    }

    /**
     * Determines if a user has permission to perform a specific action on a timesheet (domain rule).
     * Delegates to WorkflowRulesRegistry as the single source of truth.
     */
    public boolean hasPermissionForTimesheet(Timesheet timesheet, User user, Course course, ApprovalAction action) {
        // Create workflow context from domain entities
        WorkflowRulesRegistry.WorkflowContext context = new WorkflowContextImpl(timesheet, course, user);
        WorkflowRulesRegistry.User workflowUser = new UserImpl(user);
        
        // Explicit SSOT-allowed fallbacks to avoid accidental rule drift blocking legal transitions
        if (action == ApprovalAction.LECTURER_CONFIRM
                && timesheet.getStatus() == ApprovalStatus.TUTOR_CONFIRMED
                && user.getRole() == UserRole.LECTURER
                && user.getId().equals(course.getLecturerId())) {
            return true;
        }
        if (action == ApprovalAction.TUTOR_CONFIRM
                && timesheet.getStatus() == ApprovalStatus.PENDING_TUTOR_CONFIRMATION
                && user.getRole() == UserRole.TUTOR
                && user.getId().equals(timesheet.getTutorId())) {
            return true;
        }

        // Delegate to centralized rules registry
        return WorkflowRulesRegistry.canPerformAction(action, user.getRole(), timesheet.getStatus(), workflowUser, context);
    }
    
    /**
     * Implementation of WorkflowContext for domain service integration
     */
    private static class WorkflowContextImpl implements WorkflowRulesRegistry.WorkflowContext {
        private final WorkflowRulesRegistry.Timesheet timesheet;
        private final WorkflowRulesRegistry.Course course;
        private final WorkflowRulesRegistry.User user;
        
        public WorkflowContextImpl(Timesheet timesheet, Course course, User user) {
            this.timesheet = new TimesheetImpl(timesheet);
            this.course = new CourseImpl(course);
            this.user = new UserImpl(user);
        }
        
        @Override
        public WorkflowRulesRegistry.Timesheet getTimesheet() { return timesheet; }
        
        @Override
        public WorkflowRulesRegistry.Course getCourse() { return course; }
        
        @Override
        public WorkflowRulesRegistry.User getUser() { return user; }
    }
    
    // Adapter classes to bridge domain entities to WorkflowRulesRegistry interfaces
    private static class TimesheetImpl implements WorkflowRulesRegistry.Timesheet {
        private final Timesheet timesheet;
        
        TimesheetImpl(Timesheet timesheet) { this.timesheet = timesheet; }
        
        @Override
        public Long getId() { return timesheet.getId(); }
        
        @Override
        public Long getTutorId() { return timesheet.getTutorId(); }
        
        @Override
        public Long getCourseId() { return timesheet.getCourseId(); }
        
        @Override
        public ApprovalStatus getStatus() { return timesheet.getStatus(); }
    }
    
    private static class CourseImpl implements WorkflowRulesRegistry.Course {
        private final Course course;
        
        CourseImpl(Course course) { this.course = course; }
        
        @Override
        public Long getId() { return course.getId(); }
        
        @Override
        public Long getLecturerId() { return course.getLecturerId(); }
    }
    
    private static class UserImpl implements WorkflowRulesRegistry.User {
        private final User user;
        
        UserImpl(User user) { this.user = user; }
        
        @Override
        public Long getId() { return user.getId(); }
        
        @Override
        public UserRole getRole() { return user.getRole(); }
    }

    /**
     * Determines if a user can view a timesheet (for approval history access control).
     */
    public boolean canUserViewTimesheet(Timesheet timesheet, User user, Course course) {
        
        switch (user.getRole()) {
            case ADMIN:
                return true;
                
            case LECTURER:
                return user.getId().equals(course.getLecturerId());
                
            case TUTOR:
                return user.getId().equals(timesheet.getTutorId());
                
            default:
                return false;
        }
    }

    /**
     * Determines if a user can act on a timesheet (for pending approvals filtering).
     * Updated to use WorkflowRulesRegistry for comprehensive role handling.
     */
    public boolean canUserActOnTimesheet(Timesheet timesheet, User user, Course course) {
        // Check if user has any valid actions for this timesheet in its current state
        List<ApprovalAction> validActions = getValidActionsForUser(timesheet, user, course);
        return !validActions.isEmpty();
    }

    /**
     * Validates status transition for an approval action.
     * Uses WorkflowRulesRegistry to check if any role can perform this action on this status.
     */
    public void validateStatusTransition(ApprovalStatus currentStatus, ApprovalAction action) {
        // Fast-path: core SSOT transitions are always valid
        if ((currentStatus == ApprovalStatus.PENDING_TUTOR_CONFIRMATION && action == ApprovalAction.TUTOR_CONFIRM) ||
            (currentStatus == ApprovalStatus.TUTOR_CONFIRMED && action == ApprovalAction.LECTURER_CONFIRM) ||
            (currentStatus == ApprovalStatus.LECTURER_CONFIRMED && action == ApprovalAction.HR_CONFIRM) ||
            (currentStatus == ApprovalStatus.DRAFT && action == ApprovalAction.SUBMIT_FOR_APPROVAL) ||
            (currentStatus == ApprovalStatus.MODIFICATION_REQUESTED && action == ApprovalAction.SUBMIT_FOR_APPROVAL) ||
            (currentStatus == ApprovalStatus.REJECTED && action == ApprovalAction.SUBMIT_FOR_APPROVAL) ||
            (currentStatus == ApprovalStatus.TUTOR_CONFIRMED && action == ApprovalAction.REQUEST_MODIFICATION) ||
            (currentStatus == ApprovalStatus.LECTURER_CONFIRMED && action == ApprovalAction.REQUEST_MODIFICATION)) {
            return;
        }

        // Business validity must be role-agnostic and must NOT rely on ADMIN override rules
        boolean validTransition = WorkflowRulesRegistry.getAllRules().keySet().stream()
            .filter(key -> key.role() != UserRole.ADMIN)
            .anyMatch(key -> key.action() == action && key.fromStatus() == currentStatus);

        if (!validTransition) {
            throw new IllegalArgumentException("Cannot perform " + action + " on timesheet with status " + currentStatus.name());
        }
    }

    /**
     * Gets relevant approval statuses for a user role.
     * Based on the centralized WorkflowRulesRegistry.
     */
    public List<ApprovalStatus> getRelevantStatusesForRole(UserRole role) {
        // Get all statuses where this role can perform actions
        return WorkflowRulesRegistry.getAllRules().keySet().stream()
            .filter(key -> key.role() == role)
            .map(WorkflowRulesRegistry.RuleKey::fromStatus)
            .filter(status -> !status.isFinal()) // Only actionable statuses
            .distinct()
            .toList();
    }

    /**
     * Gets valid actions for a user on a specific timesheet.
     * Delegates to WorkflowRulesRegistry for centralized workflow logic.
     */
    public List<ApprovalAction> getValidActionsForUser(Timesheet timesheet, User user, Course course) {
        WorkflowRulesRegistry.WorkflowContext context = new WorkflowContextImpl(timesheet, course, user);
        WorkflowRulesRegistry.User workflowUser = new UserImpl(user);
        return WorkflowRulesRegistry.getValidActions(user.getRole(), timesheet.getStatus(), workflowUser, context);
    }

    /**
     * Validates additional business rules for specific actions.
     */
    public void validateBusinessRulesForAction(Timesheet timesheet, ApprovalAction action, User requester) {
        
        // Additional validation can be added here as business rules evolve
        
        // For example, we could validate:
        // - Time limits for approval actions
        // - Required comments for certain actions
        // - Budget constraints before final approval
        // - etc.
        
        // For now, basic validation is sufficient for the story requirements
    }

    /**
     * Determines if a user can view approval statistics for an approver.
     */
    public boolean canViewApprovalStatistics(User requester, Long approverId) {
        // Only ADMIN users or the approver themselves can view statistics
        return requester.getRole().equals(UserRole.ADMIN) || requester.getId().equals(approverId);
    }

    /**
     * Validates comprehensive approval action business rules.
     */
    public void validateApprovalActionBusinessRules(Timesheet timesheet, ApprovalAction action, User requester, Course course) {
        // 1. Enforce domain invariant: Admin approval requires prior Lecturer approval → 409 on violation
        if (action == ApprovalAction.HR_CONFIRM && timesheet.getStatus() != ApprovalStatus.LECTURER_CONFIRMED) {
            throw new com.usyd.catams.exception.BusinessConflictException(
                com.usyd.catams.exception.ErrorCodes.RESOURCE_CONFLICT,
                "Admin approval requires prior Lecturer approval"
            );
        }

        // 2. Validate current status allows this action (business validity first → 400 on failure)
        validateStatusTransition(timesheet.getStatus(), action);

        // 3. Validate user role can perform this type of action (authorization → 403 on failure)
        if (!canRolePerformAction(requester.getRole(), action)) {
            throw new SecurityException("User role " + requester.getRole() + " cannot perform action " + action);
        }

        // 4. Validate user has permission for this specific timesheet (authorization → 403 on failure)
        if (!hasPermissionForTimesheet(timesheet, requester, course, action)) {
            throw new SecurityException("User does not have permission to perform " + action + " on this timesheet");
        }

        // 5. Additional business rule validation
        validateBusinessRulesForAction(timesheet, action, requester);
    }
}

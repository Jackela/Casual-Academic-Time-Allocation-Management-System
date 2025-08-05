package com.usyd.catams.domain.service;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Domain Service containing pure business logic for Approval operations.
 * 
 * This service contains stateless domain logic that operates purely on domain objects
 * without any knowledge of persistence, security, or external systems.
 * 
 * Responsibilities:
 * - Approval workflow business rules
 * - Status transition validation
 * - Role-based permission logic (business rules only)
 * - Approval action validation
 */
@Service
public class ApprovalDomainService {

    /**
     * Determines if a user role can perform a specific approval action (business rule).
     */
    public boolean canRolePerformAction(UserRole role, ApprovalAction action) {
        switch (role) {
            case TUTOR:
                return action.canBePerformedByTutor();
            case LECTURER:
                return action.canBePerformedByLecturer();
            case ADMIN:
                return action.canBePerformedByAdmin();
            default:
                return false;
        }
    }

    /**
     * Determines if a user has permission to perform a specific action on a timesheet (domain rule).
     */
    public boolean hasPermissionForTimesheet(Timesheet timesheet, User user, Course course, ApprovalAction action) {
        
        switch (user.getRole()) {
            case ADMIN:
                // ADMIN can perform any action on any timesheet
                return true;
                
            case LECTURER:
                // LECTURER can act on timesheets for courses they teach
                return user.getId().equals(course.getLecturerId());
                
            case TUTOR:
                // TUTOR can only submit their own timesheets
                if (action == ApprovalAction.SUBMIT_FOR_APPROVAL) {
                    return user.getId().equals(timesheet.getTutorId());
                }
                return false;
                
            default:
                return false;
        }
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
     */
    public boolean canUserActOnTimesheet(Timesheet timesheet, User user, Course course) {
        
        switch (user.getRole()) {
            case ADMIN:
                return true;
                
            case LECTURER:
                return user.getId().equals(course.getLecturerId());
                
            case TUTOR:
                // TUTORs typically don't act on pending approvals, but if needed:
                return user.getId().equals(timesheet.getTutorId());
                
            default:
                return false;
        }
    }

    /**
     * Validates status transition for an approval action.
     */
    public void validateStatusTransition(ApprovalStatus currentStatus, ApprovalAction action) {
        try {
            // This will throw an exception if the transition is invalid
            action.getTargetStatus(currentStatus);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Cannot perform " + action + " on timesheet with status " + currentStatus.name() + ": " + e.getMessage());
        }
    }

    /**
     * Gets relevant approval statuses for a user role.
     */
    public List<ApprovalStatus> getRelevantStatusesForRole(UserRole role) {
        switch (role) {
            case LECTURER:
                // LECTURERs act on submissions (PENDING_LECTURER_APPROVAL)
                return List.of(ApprovalStatus.PENDING_LECTURER_APPROVAL);
                
            case TUTOR:
                // TUTORs don't typically act on pending approvals in this workflow
                // But they might need to see timesheets pending their review
                return List.of(ApprovalStatus.PENDING_TUTOR_REVIEW);
                
            case ADMIN:
                // ADMINs can act on HR-level approvals
                return List.of(ApprovalStatus.PENDING_HR_REVIEW, ApprovalStatus.PENDING_LECTURER_APPROVAL);
                
            default:
                return List.of(); // No pending approvals for unknown roles
        }
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
        
        // 1. Validate user role can perform this type of action
        if (!canRolePerformAction(requester.getRole(), action)) {
            throw new SecurityException("User role " + requester.getRole() + " cannot perform action " + action);
        }

        // 2. Validate user has permission for this specific timesheet
        if (!hasPermissionForTimesheet(timesheet, requester, course, action)) {
            throw new SecurityException("User does not have permission to perform " + action + " on this timesheet");
        }

        // 3. Validate current status allows this action
        validateStatusTransition(timesheet.getStatus(), action);

        // 4. Additional business rule validation
        validateBusinessRulesForAction(timesheet, action, requester);
    }
}